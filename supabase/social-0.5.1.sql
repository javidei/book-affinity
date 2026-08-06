-- Book Affinity · actualización social 0.5.1
-- Muestra todos los libros publicados, independientemente de su estado.
-- Ejecuta este archivo completo en Supabase > SQL Editor.

create or replace function public.book_affinity_find_reader(p_username text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_username text := lower(trim(coalesce(p_username, '')));
  v_profile public.book_affinity_profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para buscar lectores.' using errcode = '42501';
  end if;

  if v_username !~ '^[a-z0-9_]{3,24}$' then
    return null;
  end if;

  select * into v_profile
  from public.book_affinity_profiles
  where username_normalized = v_username;

  if not found then return null; end if;

  return jsonb_build_object(
    'user_id', v_profile.user_id,
    'username', v_profile.username,
    'avatar_id', v_profile.avatar_id,
    'is_me', v_profile.user_id = auth.uid(),
    'is_following', exists (
      select 1 from public.book_affinity_follows
      where follower_id = auth.uid() and followed_id = v_profile.user_id
    ),
    'followers_count', (
      select count(*) from public.book_affinity_follows where followed_id = v_profile.user_id
    ),
    'following_count', (
      select count(*) from public.book_affinity_follows where follower_id = v_profile.user_id
    ),
    -- Se conserva el nombre de la propiedad por compatibilidad con la web,
    -- pero ahora cuenta todos los libros publicados.
    'published_reading_count', (
      select count(*) from public.books
      where user_id = v_profile.user_id and is_public = true
    )
  );
end;
$$;

create or replace function public.book_affinity_list_following()
returns table (
  user_id uuid,
  username text,
  avatar_id text,
  followed_at timestamptz,
  published_reading_count bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select
    profile.user_id,
    profile.username,
    profile.avatar_id,
    follow.created_at,
    count(book.id) filter (where book.is_public = true)
  from public.book_affinity_follows as follow
  join public.book_affinity_profiles as profile on profile.user_id = follow.followed_id
  left join public.books as book on book.user_id = profile.user_id
  where follow.follower_id = auth.uid()
  group by profile.user_id, profile.username, profile.avatar_id, follow.created_at
  order by lower(profile.username);
$$;

create or replace function public.book_affinity_social_feed()
returns table (
  id uuid,
  owner_user_id uuid,
  owner_username text,
  owner_avatar_id text,
  title text,
  subtitle text,
  authors text[],
  cover_url text,
  thumbnail_url text,
  categories text[],
  page_count integer,
  current_page integer,
  progress_percent numeric,
  status text,
  rating numeric,
  updated_at timestamptz,
  comments_count bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select
    book.id,
    book.user_id,
    profile.username,
    profile.avatar_id,
    book.title,
    book.subtitle,
    book.authors,
    book.cover_url,
    book.thumbnail_url,
    book.categories,
    book.page_count,
    book.current_page,
    book.progress_percent,
    book.status,
    book.rating,
    book.updated_at,
    (select count(*) from public.book_affinity_comments as comment where comment.book_id = book.id)
  from public.book_affinity_follows as follow
  join public.book_affinity_profiles as profile on profile.user_id = follow.followed_id
  join public.books as book on book.user_id = follow.followed_id
  where follow.follower_id = auth.uid()
    and book.is_public = true
  order by book.updated_at desc;
$$;

revoke all on function public.book_affinity_find_reader(text) from public;
revoke all on function public.book_affinity_list_following() from public;
revoke all on function public.book_affinity_social_feed() from public;

grant execute on function public.book_affinity_find_reader(text) to authenticated;
grant execute on function public.book_affinity_list_following() to authenticated;
grant execute on function public.book_affinity_social_feed() to authenticated;
