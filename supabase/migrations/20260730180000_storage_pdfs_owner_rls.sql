-- EchoReadly: Scope private `pdfs` Storage RLS to the authenticated owner.
-- Object keys MUST be `{auth.uid()}/{fileId}.pdf`.
-- Replaces broad authenticated policies from 20260729190000_storage_pdfs_rls.sql.

insert into storage.buckets (id, name, public)
values ('pdfs', 'pdfs', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "pdfs_select_authenticated" on storage.objects;
drop policy if exists "pdfs_insert_authenticated" on storage.objects;
drop policy if exists "pdfs_update_authenticated" on storage.objects;
drop policy if exists "pdfs_delete_authenticated" on storage.objects;

drop policy if exists "pdfs_select_own" on storage.objects;
drop policy if exists "pdfs_insert_own" on storage.objects;
drop policy if exists "pdfs_update_own" on storage.objects;
drop policy if exists "pdfs_delete_own" on storage.objects;

-- First folder segment of the object name must equal auth.uid().
create policy "pdfs_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "pdfs_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "pdfs_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "pdfs_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
