-- Book Affinity · sistema de logros
-- Versión 0.6.0 · 06/08/2026
-- Ejecuta este archivo completo en Supabase > SQL Editor.
-- No crea datos duplicados y puede volver a ejecutarse.

create or replace function public.book_affinity_achievement_stats()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_books_total bigint := 0;
  v_books_finished bigint := 0;
  v_books_public bigint := 0;
  v_pages_total bigint := 0;
  v_followers bigint := 0;
  v_following bigint := 0;
  v_comments_written bigint := 0;
  v_comments_received bigint := 0;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para consultar tus logros.' using errcode = '42501';
  end if;

  select
    count(*),
    count(*) filter (where status = 'finished'),
    count(*) filter (where is_public = true),
    coalesce(sum(greatest(current_page, 0)), 0)
  into
    v_books_total,
    v_books_finished,
    v_books_public,
    v_pages_total
  from public.books
  where user_id = v_user_id;

  select count(*) into v_followers
  from public.book_affinity_follows
  where followed_id = v_user_id;

  select count(*) into v_following
  from public.book_affinity_follows
  where follower_id = v_user_id;

  select count(*) into v_comments_written
  from public.book_affinity_comments
  where user_id = v_user_id;

  select count(*) into v_comments_received
  from public.book_affinity_comments as comment
  join public.books as book on book.id = comment.book_id
  where book.user_id = v_user_id
    and comment.user_id <> v_user_id;

  return jsonb_build_object(
    'books_total', v_books_total,
    'books_finished', v_books_finished,
    'books_public', v_books_public,
    'pages_total', v_pages_total,
    'followers_count', v_followers,
    'following_count', v_following,
    'comments_written', v_comments_written,
    'comments_received', v_comments_received
  );
end;
$$;

revoke all on function public.book_affinity_achievement_stats() from public;
grant execute on function public.book_affinity_achievement_stats() to authenticated;

comment on function public.book_affinity_achievement_stats() is
  'Devuelve únicamente las estadísticas agregadas de la cuenta necesarias para calcular los logros de Book Affinity.';
