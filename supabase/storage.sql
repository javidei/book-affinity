-- Book Affinity · almacenamiento de portadas
-- Versión 0.2.1 · 05/08/2026
-- Ejecuta este archivo completo en Supabase > SQL Editor.

-- Mantiene la ruta interna de la portada personalizada.
alter table public.books
  add column if not exists cover_path text;

-- Crea el bucket de portadas si todavía no existe.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'book-covers',
  'book-covers',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Cada usuario solo puede gestionar imágenes dentro de su propia carpeta.
drop policy if exists "book_covers_select_own" on storage.objects;
create policy "book_covers_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'book-covers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "book_covers_insert_own" on storage.objects;
create policy "book_covers_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'book-covers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "book_covers_update_own" on storage.objects;
create policy "book_covers_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'book-covers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'book-covers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "book_covers_delete_own" on storage.objects;
create policy "book_covers_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'book-covers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

comment on column public.books.cover_path is
  'Ruta de la portada personalizada dentro del bucket book-covers.';
