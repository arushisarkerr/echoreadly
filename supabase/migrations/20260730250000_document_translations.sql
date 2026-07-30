-- EchoReadly: cached document translations (owned, scoped, content-hash keyed).

create table if not exists public.document_translations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  scope text not null check (
    scope in ('document', 'page', 'selection', 'summary')
  ),
  page_number integer check (page_number is null or page_number >= 1),
  summary_type text check (
    summary_type is null
    or summary_type in ('short', 'detailed', 'bullet')
  ),
  selection_hash text,
  target_language text not null,
  source_content_hash text not null,
  source_text text not null,
  translated_text text not null,
  model text not null,
  generated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint document_translations_scope_shape_check check (
    (
      scope = 'document'
      and page_number is null
      and summary_type is null
      and selection_hash is null
    )
    or (
      scope = 'page'
      and page_number is not null
      and summary_type is null
      and selection_hash is null
    )
    or (
      scope = 'selection'
      and selection_hash is not null
      and page_number is null
      and summary_type is null
    )
    or (
      scope = 'summary'
      and summary_type is not null
      and page_number is null
      and selection_hash is null
    )
  )
);

create unique index if not exists document_translations_identity_uidx
  on public.document_translations (
    user_id,
    document_id,
    scope,
    coalesce(page_number, 0),
    coalesce(summary_type, ''),
    coalesce(selection_hash, ''),
    target_language,
    source_content_hash
  );

create index if not exists document_translations_user_document_idx
  on public.document_translations (user_id, document_id);

create index if not exists document_translations_user_updated_at_idx
  on public.document_translations (user_id, updated_at desc);

drop trigger if exists document_translations_set_updated_at on public.document_translations;
create trigger document_translations_set_updated_at
  before update on public.document_translations
  for each row
  execute function public.set_updated_at();

alter table public.document_translations enable row level security;

drop policy if exists "document_translations_select_own" on public.document_translations;
drop policy if exists "document_translations_insert_own" on public.document_translations;
drop policy if exists "document_translations_update_own" on public.document_translations;
drop policy if exists "document_translations_delete_own" on public.document_translations;

create policy "document_translations_select_own"
  on public.document_translations
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "document_translations_insert_own"
  on public.document_translations
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "document_translations_update_own"
  on public.document_translations
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "document_translations_delete_own"
  on public.document_translations
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Extend audio export cache identity with optional target language.
alter table public.audio_exports
  add column if not exists target_language text not null default '';

drop index if exists audio_exports_identity_uidx;

create unique index if not exists audio_exports_identity_uidx
  on public.audio_exports (
    user_id,
    document_storage_path,
    source,
    coalesce(page_number, 0),
    coalesce(summary_type, ''),
    voice,
    coalesce(target_language, '')
  );
