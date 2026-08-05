-- Book Affinity · perfiles y nombres de usuario
-- Migración 0.4.2 · 05/08/2026
-- Ejecuta este archivo completo en Supabase > SQL Editor.
-- Es seguro volver a ejecutarlo y no modifica la tabla genérica public.profiles.

-- Se usa un nombre propio para evitar conflictos con otros proyectos del mismo Supabase.
create table if not exists public.book_affinity_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text,
  username_normalized text generated always as (lower(trim(username))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint book_affinity_profiles_username_format check (
    username is null
    or username ~ '^[A-Za-z0-9_]{3,24}$'
  )
);

-- Repara también una creación parcial de esta tabla concreta.
alter table public.book_affinity_profiles
  add column if not exists username text;

alter table public.book_affinity_profiles
  add column if not exists username_normalized text
  generated always as (lower(trim(username))) stored;

alter table public.book_affinity_profiles
  add column if not exists created_at timestamptz not null default now();

alter table public.book_affinity_profiles
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists book_affinity_profiles_username_unique
  on public.book_affinity_profiles (username_normalized)
  where username_normalized is not null;

-- Crea el perfil de los usuarios existentes.
insert into public.book_affinity_profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- Crea automáticamente el perfil de futuros usuarios.
create or replace function public.book_affinity_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.book_affinity_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists book_affinity_create_profile on auth.users;
create trigger book_affinity_create_profile
after insert on auth.users
for each row execute function public.book_affinity_handle_new_user();

create or replace function public.book_affinity_set_profile_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists book_affinity_profiles_set_updated_at on public.book_affinity_profiles;
create trigger book_affinity_profiles_set_updated_at
before update on public.book_affinity_profiles
for each row execute function public.book_affinity_set_profile_updated_at();

alter table public.book_affinity_profiles enable row level security;

drop policy if exists "book_affinity_profiles_select_own" on public.book_affinity_profiles;
create policy "book_affinity_profiles_select_own"
on public.book_affinity_profiles for select to authenticated
using ((select auth.uid()) = user_id);

-- El navegador solo puede leer el perfil propio. Los cambios pasan por una función segura.
revoke all on table public.book_affinity_profiles from anon, authenticated;
grant select on table public.book_affinity_profiles to authenticated;

-- La Edge Function usa una clave secreta que actúa como service_role.
-- El rol omite RLS, pero necesita permiso SQL explícito sobre la tabla.
grant usage on schema public to service_role;
grant select on table public.book_affinity_profiles to service_role;

create or replace function public.book_affinity_check_username_available(p_username text)
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
    from public.book_affinity_profiles
    where username_normalized = v_username
      and user_id <> auth.uid()
  );
end;
$$;

create or replace function public.book_affinity_set_my_username(p_username text)
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
    from public.book_affinity_profiles
    where username_normalized = v_username
      and user_id <> v_user_id
  ) then
    raise exception 'Este nombre de usuario ya está en uso.' using errcode = '23505';
  end if;

  insert into public.book_affinity_profiles (user_id, username)
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

revoke all on function public.book_affinity_check_username_available(text) from public;
revoke all on function public.book_affinity_set_my_username(text) from public;
grant execute on function public.book_affinity_check_username_available(text) to authenticated;
grant execute on function public.book_affinity_set_my_username(text) to authenticated;

comment on table public.book_affinity_profiles is 'Perfiles privados y aislados de Book Affinity.';
comment on column public.book_affinity_profiles.username is 'Nombre único usado como alternativa al correo para iniciar sesión.';
comment on column public.book_affinity_profiles.username_normalized is 'Versión normalizada para comparar nombres sin distinguir mayúsculas.';
