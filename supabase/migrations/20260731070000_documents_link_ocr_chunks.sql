-- EchoReadly: link/OCR metadata + chunks for shared processing pipeline.
-- document_chunks ownership follows the existing schema: user_id on the row
-- (nullable for guest docs) and/or inherit owner via documents.document_id.
-- Do NOT invent document_chunks.guest_id — that column does not exist in production.

alter table public.documents
  add column if not exists source_url text;

alter table public.documents
  add column if not exists source_metadata jsonb;

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  chunk_index integer not null,
  text text not null default '',
  character_count integer not null default 0 check (character_count >= 0),
  created_at timestamptz not null default now(),
  constraint document_chunks_document_id_chunk_index_key unique (document_id, chunk_index)
);

create index if not exists document_chunks_document_id_idx
  on public.document_chunks (document_id);

create index if not exists documents_guest_id_source_url_idx
  on public.documents (guest_id, source_url)
  where guest_id is not null and source_url is not null;
