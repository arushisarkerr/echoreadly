-- EchoReadly: Storage RLS for private `pdfs` bucket
-- Uploads insert into storage.objects (not public.documents).
-- Without these policies, authenticated client uploads fail with:
--   "new row violates row-level security policy"

insert into storage.buckets (id, name, public)
values ('pdfs', 'pdfs', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "pdfs_select_authenticated" on storage.objects;
drop policy if exists "pdfs_insert_authenticated" on storage.objects;
drop policy if exists "pdfs_update_authenticated" on storage.objects;
drop policy if exists "pdfs_delete_authenticated" on storage.objects;

create policy "pdfs_select_authenticated"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'pdfs');

create policy "pdfs_insert_authenticated"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'pdfs');

create policy "pdfs_update_authenticated"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'pdfs')
  with check (bucket_id = 'pdfs');

create policy "pdfs_delete_authenticated"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'pdfs');
