-- EchoReadly: repair ownership model if an earlier revision dropped documents_user_id_fkey.
-- Safe to re-run. Prefer guest_id for pre-auth uploads; keep FK for authenticated users.

alter table public.documents
  add column if not exists guest_id uuid;

alter table public.documents
  alter column user_id drop not null;

alter table public.documents
  drop constraint if exists documents_owner_present_check;

alter table public.documents
  add constraint documents_owner_present_check
  check (
    (user_id is not null and guest_id is null)
    or (user_id is null and guest_id is not null)
  );

-- Restore referential integrity for authenticated owners.
alter table public.documents
  drop constraint if exists documents_user_id_fkey;

alter table public.documents
  add constraint documents_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

create index if not exists documents_guest_id_idx
  on public.documents (guest_id);

drop index if exists documents_user_id_storage_path_key;

create unique index if not exists documents_user_id_storage_path_key
  on public.documents (user_id, storage_path)
  where user_id is not null;

create unique index if not exists documents_guest_id_storage_path_key
  on public.documents (guest_id, storage_path)
  where guest_id is not null;

-- Rows previously inserted with guest UUIDs in user_id (no auth.users match) cannot
-- satisfy the restored FK. Relocate those orphan owner ids into guest_id.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'documents'
      and column_name = 'guest_id'
  ) then
    update public.documents d
    set
      guest_id = d.user_id,
      user_id = null
    where d.user_id is not null
      and d.guest_id is null
      and not exists (
        select 1
        from auth.users u
        where u.id = d.user_id
      );
  end if;
end
$$;
