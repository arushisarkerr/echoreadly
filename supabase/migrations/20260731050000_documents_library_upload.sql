-- EchoReadly: document library fields for upload → library flow
-- Extends existing public.documents for MIME/filename and guest-safe ownership.
-- Keeps documents_user_id_fkey intact for authenticated ownership integrity.

alter table public.documents
  add column if not exists mime_type text;

alter table public.documents
  add column if not exists filename text;

alter table public.documents
  add column if not exists guest_id uuid;

update public.documents
set
  mime_type = coalesce(nullif(mime_type, ''), 'application/pdf'),
  filename = coalesce(nullif(filename, ''), original_file_name)
where mime_type is null
   or mime_type = ''
   or filename is null
   or filename = '';

alter table public.documents
  alter column mime_type set default 'application/pdf';

alter table public.documents
  alter column mime_type set not null;

alter table public.documents
  alter column filename set not null;

-- Authenticated owner remains FK-backed; guest uploads use guest_id instead.
alter table public.documents
  alter column user_id drop not null;

-- Exactly one ownership mode per row.
alter table public.documents
  drop constraint if exists documents_owner_present_check;

alter table public.documents
  add constraint documents_owner_present_check
  check (
    (user_id is not null and guest_id is null)
    or (user_id is null and guest_id is not null)
  );

-- Ensure authenticated FK remains (or is restored) for real user ownership.
alter table public.documents
  drop constraint if exists documents_user_id_fkey;

alter table public.documents
  add constraint documents_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

create index if not exists documents_guest_id_idx
  on public.documents (guest_id);

-- One document row per owner + storage object (prevents duplicate upload records).
drop index if exists documents_user_id_storage_path_key;

create unique index if not exists documents_user_id_storage_path_key
  on public.documents (user_id, storage_path)
  where user_id is not null;

create unique index if not exists documents_guest_id_storage_path_key
  on public.documents (guest_id, storage_path)
  where guest_id is not null;
