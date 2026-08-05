-- Book Affinity · perfiles y nombres de usuario
-- Migración 0.4.1 · 05/08/2026
-- Ejecuta este archivo completo en Supabase > SQL Editor.
-- Es seguro volver a ejecutarlo: también repara instalaciones parciales.

-- 1. Tabla base.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- 2. Añade las columnas aunque la tabla ya existiera de una ejecución anterior.
alter table public.profiles
  add column if not exists username text;

alter table public.profiles
  add column if not exists username_normalized text
  generated always as (lower(trim(username))) stored;

alter table public.profiles
  add column if not exists created_at timestamptz not null default now();

alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

-- 3. Añade la validación solo cuando todavía no exista.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_format'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_username_format check (
        username is null
        or username ~ '^[A-Za-z0-9_]{3,24}$'
      );
  end if;
end;
$$;

-- La columna ya existe en este punto, incluso si la primera ejecución quedó a medias.
create unique index if not exists profiles_username_normalized_unique
  on public.profiles (username_normalized)
  where username_normalized is not null;

-- 4. Crea el perfil de los usuarios existentes.
insert into public.profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- 5. Crea automáticamente el perfil de futuros usuarios.
create or replace function public.handle_new_book_affinity_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists book_affinity_create_profile on auth.users;
create trigger book_affinity_create_profile
after insert on auth.users
for each row execute function public.handle_new_book_affinity_user();

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_profile_updated_at();

-- 6. Seguridad: cada cuenta solo puede leer su propio perfil.
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);

-- Los cambios de usuario se realizan mediante la función segura set_my_username.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

-- 7. Comprueba disponibilidad sin exponer correos ni otros perfiles.
create or replace function public.check_username_available(p_username text)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_username text := lower(trim(coalesce(p_username, '')));
begin
  if auth.uid() is null then
    return false;
  end if;

  if v_username !~ '^[a-z0-9_]{3,24}$' then
    return false;
  end if;

  return not exists (
    select 1
    from public.profiles
    where username_normalized = v_username
      and user_id <> auth.uid()
  );
end;
$$;

-- 8. Guarda el usuario de la cuenta autenticada y vuelve a comprobar unicidad.
create or replace function public.set_my_username(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_username text := lower(trim(coalesce(p_username, '')));
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para cambiar el usuario.' using errcode = '42501';
  end if;

  if v_username !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'El usuario debe tener entre 3 y 24 caracteres y solo puede contener letras, números y guion bajo.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.profiles
    where username_normalized = v_username
      and user_id <> v_user_id
  ) then
    raise exception 'Este nombre de usuario ya está en uso.' using errcode = '23505';
  end if;

  insert into public.profiles (user_id, username)
  values (v_user_id, v_username)
  on conflict (user_id) do update
    set username = excluded.username,
        updated_at = now();

  return jsonb_build_object(
    'user_id', v_user_id,
    'username', v_username
  );
end;
$$;

revoke all on function public.check_username_available(text) from public;
revoke all on function public.set_my_username(text) from public;
grant execute on function public.check_username_available(text) to authenticated;
grant execute on function public.set_my_username(text) to authenticated;

comment on table public.profiles is 'Perfil privado de cada usuario de Book Affinity.';
comment on column public.profiles.username is 'Nombre de usuario único usado como alternativa al correo para iniciar sesión.';
comment on column public.profiles.username_normalized is 'Versión normalizada que garantiza la unicidad sin distinguir mayúsculas.';
