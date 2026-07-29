-- EchoReadly Phase 10B: user ownership + Row Level Security
-- Scopes documents, chunks, and summaries to auth.users and enforces per-user access.

-- Clear existing processing rows so NOT NULL user_id can be applied cleanly.
-- (Phase 8 data was unowned; re-process after deploying this migration.)
truncate table public.document_summaries restart identity cascade;
truncate table public.document_chunks restart identity cascade;
truncate table public.documents restart identity cascade;

-- documents.user_id
alter table public.documents
  add column if not exists user_id uuid;

alter table public.documents
  drop constraint if exists documents_user_id_fkey;

alter table public.documents
  add constraint documents_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

alter table public.documents
  alter column user_id set not null;

-- Hash reuse is per-user (same PDF can be processed independently for each account).
alter table public.documents
  drop constraint if exists documents_document_hash_key;

alter table public.documents
  drop constraint if exists documents_user_id_document_hash_key;

alter table public.documents
  add constraint documents_user_id_document_hash_key unique (user_id, document_hash);

create index if not exists documents_user_id_idx
  on public.documents (user_id);

create index if not exists documents_user_id_storage_path_idx
  on public.documents (user_id, storage_path);

-- document_chunks.user_id
alter table public.document_chunks
  add column if not exists user_id uuid;

alter table public.document_chunks
  drop constraint if exists document_chunks_user_id_fkey;

alter table public.document_chunks
  add constraint document_chunks_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

alter table public.document_chunks
  alter column user_id set not null;

create index if not exists document_chunks_user_id_idx
  on public.document_chunks (user_id);

create index if not exists document_chunks_user_id_document_id_idx
  on public.document_chunks (user_id, document_id);

-- document_summaries.user_id
alter table public.document_summaries
  add column if not exists user_id uuid;

alter table public.document_summaries
  drop constraint if exists document_summaries_user_id_fkey;

alter table public.document_summaries
  add constraint document_summaries_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

alter table public.document_summaries
  alter column user_id set not null;

create index if not exists document_summaries_user_id_idx
  on public.document_summaries (user_id);

create index if not exists document_summaries_user_id_document_id_idx
  on public.document_summaries (user_id, document_id);

-- Row Level Security (already enabled in Phase 8; ensure + replace policies)
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.document_summaries enable row level security;

-- documents policies
drop policy if exists "documents_select_own" on public.documents;
drop policy if exists "documents_insert_own" on public.documents;
drop policy if exists "documents_update_own" on public.documents;
drop policy if exists "documents_delete_own" on public.documents;

create policy "documents_select_own"
  on public.documents
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "documents_insert_own"
  on public.documents
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "documents_update_own"
  on public.documents
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "documents_delete_own"
  on public.documents
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- document_chunks policies
drop policy if exists "document_chunks_select_own" on public.document_chunks;
drop policy if exists "document_chunks_insert_own" on public.document_chunks;
drop policy if exists "document_chunks_update_own" on public.document_chunks;
drop policy if exists "document_chunks_delete_own" on public.document_chunks;

create policy "document_chunks_select_own"
  on public.document_chunks
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "document_chunks_insert_own"
  on public.document_chunks
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "document_chunks_update_own"
  on public.document_chunks
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "document_chunks_delete_own"
  on public.document_chunks
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- document_summaries policies
drop policy if exists "document_summaries_select_own" on public.document_summaries;
drop policy if exists "document_summaries_insert_own" on public.document_summaries;
drop policy if exists "document_summaries_update_own" on public.document_summaries;
drop policy if exists "document_summaries_delete_own" on public.document_summaries;

create policy "document_summaries_select_own"
  on public.document_summaries
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "document_summaries_insert_own"
  on public.document_summaries
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "document_summaries_update_own"
  on public.document_summaries
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "document_summaries_delete_own"
  on public.document_summaries
  for delete
  to authenticated
  using (auth.uid() = user_id);
