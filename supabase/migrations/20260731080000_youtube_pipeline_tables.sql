-- YouTube pipeline: stages, translations, audio, exports, activity history.
-- Child rows inherit library ownership through documents.document_id.
-- Do not invent document_chunks.guest_id.

alter table public.documents
  add column if not exists processing_stage text;

alter table public.documents
  add column if not exists processing_error text;

alter table public.documents
  add column if not exists original_language text;

create table if not exists public.document_translations (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  language_code text not null,
  language_label text not null,
  text text not null default '',
  word_count integer not null default 0 check (word_count >= 0),
  status text not null default 'ready'
    check (status in ('queued', 'processing', 'ready', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_translations_document_language_key
    unique (document_id, language_code)
);

create index if not exists document_translations_document_id_idx
  on public.document_translations (document_id);

create table if not exists public.document_audio (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  translation_id uuid references public.document_translations (id) on delete set null,
  language_code text not null,
  voice text not null default 'alloy',
  storage_path text not null,
  mime_type text not null default 'audio/mpeg',
  duration_seconds numeric,
  status text not null default 'ready'
    check (status in ('queued', 'processing', 'ready', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_audio_document_language_voice_key
    unique (document_id, language_code, voice)
);

create index if not exists document_audio_document_id_idx
  on public.document_audio (document_id);

create table if not exists public.document_exports (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  format text not null check (format in ('txt', 'pdf', 'docx', 'md', 'mp3')),
  language_code text not null default 'original',
  filename text not null,
  storage_path text,
  byte_size integer,
  created_at timestamptz not null default now()
);

create index if not exists document_exports_document_id_idx
  on public.document_exports (document_id);

-- Owner scope for history matches documents.guest_id (pre-auth import owner id).
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null,
  document_id uuid references public.documents (id) on delete set null,
  event_type text not null,
  title text not null,
  detail text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_events_guest_id_created_at_idx
  on public.activity_events (guest_id, created_at desc);

create index if not exists activity_events_document_id_idx
  on public.activity_events (document_id);

-- Optional helper for language-scoped chunk search (safe on existing table).
alter table public.document_chunks
  add column if not exists language_code text not null default 'original';
