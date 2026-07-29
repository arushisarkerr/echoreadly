-- EchoReadly Phase 8: document persistence
-- Stores processed PDF metadata, chunks, and AI summaries so work runs once per document hash.

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'processing_status'
      and n.nspname = 'public'
  ) then
    create type public.processing_status as enum (
      'uploaded',
      'processing',
      'ready',
      'failed'
    );
  end if;
end
$$;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  original_file_name text not null,
  file_size bigint not null default 0 check (file_size >= 0),
  uploaded_at timestamptz not null default timezone('utc', now()),
  page_count integer check (page_count is null or page_count >= 0),
  processing_status public.processing_status not null default 'uploaded',
  document_hash text not null,
  extracted_at timestamptz,
  chunked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint documents_document_hash_key unique (document_hash)
);

create index if not exists documents_storage_path_idx
  on public.documents (storage_path);

create index if not exists documents_processing_status_idx
  on public.documents (processing_status);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  page_number integer not null check (page_number >= 1),
  chunk_index integer not null check (chunk_index >= 0),
  text text not null,
  character_count integer not null check (character_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  constraint document_chunks_document_id_chunk_index_key unique (document_id, chunk_index)
);

create index if not exists document_chunks_document_id_idx
  on public.document_chunks (document_id);

create index if not exists document_chunks_document_id_page_number_idx
  on public.document_chunks (document_id, page_number);

create table if not exists public.document_summaries (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  summary_type text not null check (summary_type in ('short', 'detailed', 'bullet')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  model text not null,
  generated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint document_summaries_document_id_summary_type_key unique (document_id, summary_type)
);

create index if not exists document_summaries_document_id_idx
  on public.document_summaries (document_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
  before update on public.documents
  for each row
  execute function public.set_updated_at();

drop trigger if exists document_summaries_set_updated_at on public.document_summaries;
create trigger document_summaries_set_updated_at
  before update on public.document_summaries
  for each row
  execute function public.set_updated_at();

alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.document_summaries enable row level security;

-- Service role bypasses RLS. Anon/authenticated have no policies yet (auth phase later).
