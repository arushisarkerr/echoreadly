-- EchoReadly: user-owned collections and many-to-many document membership.
-- Membership references Storage paths (not duplicated document rows).

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint collections_name_length_check
    check (char_length(btrim(name)) >= 1 and char_length(name) <= 80),
  constraint collections_user_id_name_key unique (user_id, name)
);

create index if not exists collections_user_id_idx
  on public.collections (user_id);

create index if not exists collections_user_updated_at_idx
  on public.collections (user_id, updated_at desc);

drop trigger if exists collections_set_updated_at on public.collections;
create trigger collections_set_updated_at
  before update on public.collections
  for each row
  execute function public.set_updated_at();

create table if not exists public.collection_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  storage_path text not null,
  added_at timestamptz not null default timezone('utc', now()),
  constraint collection_documents_collection_storage_key
    unique (collection_id, storage_path)
);

create index if not exists collection_documents_user_id_idx
  on public.collection_documents (user_id);

create index if not exists collection_documents_collection_id_idx
  on public.collection_documents (collection_id);

create index if not exists collection_documents_user_storage_path_idx
  on public.collection_documents (user_id, storage_path);

alter table public.collections enable row level security;
alter table public.collection_documents enable row level security;

drop policy if exists "collections_select_own" on public.collections;
drop policy if exists "collections_insert_own" on public.collections;
drop policy if exists "collections_update_own" on public.collections;
drop policy if exists "collections_delete_own" on public.collections;

create policy "collections_select_own"
  on public.collections
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "collections_insert_own"
  on public.collections
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "collections_update_own"
  on public.collections
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "collections_delete_own"
  on public.collections
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "collection_documents_select_own" on public.collection_documents;
drop policy if exists "collection_documents_insert_own" on public.collection_documents;
drop policy if exists "collection_documents_update_own" on public.collection_documents;
drop policy if exists "collection_documents_delete_own" on public.collection_documents;

create policy "collection_documents_select_own"
  on public.collection_documents
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "collection_documents_insert_own"
  on public.collection_documents
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.collections c
      where c.id = collection_id
        and c.user_id = auth.uid()
    )
  );

create policy "collection_documents_update_own"
  on public.collection_documents
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.collections c
      where c.id = collection_id
        and c.user_id = auth.uid()
    )
  );

create policy "collection_documents_delete_own"
  on public.collection_documents
  for delete
  to authenticated
  using (auth.uid() = user_id);
