-- EchoReadly: align live document_translations with the YouTube/library translation API.
--
-- Cause: an older document_translations table already existed
-- (target_language, translated_text, scope, user_id, ...).
-- Migration 20260731080000 used CREATE TABLE IF NOT EXISTS, so it was a no-op
-- and never added language_code / language_label / text / status / etc.
--
-- App contract (translate-document.ts) expects:
--   language_code, language_label, text, word_count, status, error_message
-- Keep legacy columns in place (nullable) so we do not destroy historical data.

alter table public.document_translations
  add column if not exists language_code text;

alter table public.document_translations
  add column if not exists language_label text;

alter table public.document_translations
  add column if not exists text text;

alter table public.document_translations
  add column if not exists word_count integer;

alter table public.document_translations
  add column if not exists status text;

alter table public.document_translations
  add column if not exists error_message text;

-- Backfill from the legacy column names when present.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'document_translations'
      and column_name = 'target_language'
  ) then
    update public.document_translations
    set language_code = coalesce(nullif(language_code, ''), nullif(target_language, ''), 'und')
    where language_code is null or language_code = '';
  else
    update public.document_translations
    set language_code = coalesce(nullif(language_code, ''), 'und')
    where language_code is null or language_code = '';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'document_translations'
      and column_name = 'translated_text'
  ) then
    update public.document_translations
    set text = coalesce(text, translated_text, '')
    where text is null;
  else
    update public.document_translations
    set text = coalesce(text, '')
    where text is null;
  end if;
end $$;

update public.document_translations
set language_label = coalesce(nullif(language_label, ''), language_code, 'Unknown')
where language_label is null or language_label = '';

update public.document_translations
set word_count = coalesce(word_count, 0)
where word_count is null;

update public.document_translations
set status = coalesce(nullif(status, ''), 'ready')
where status is null or status = '';

alter table public.document_translations
  alter column language_code set not null;

alter table public.document_translations
  alter column language_label set not null;

alter table public.document_translations
  alter column text set default '';

alter table public.document_translations
  alter column text set not null;

alter table public.document_translations
  alter column word_count set default 0;

alter table public.document_translations
  alter column word_count set not null;

alter table public.document_translations
  alter column status set default 'ready';

alter table public.document_translations
  alter column status set not null;

-- Relax legacy auth-era NOT NULL columns so guest library translations can insert.
alter table public.document_translations
  alter column user_id drop not null;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'document_translations'
      and column_name = 'scope'
  ) then
    alter table public.document_translations alter column scope drop not null;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'document_translations'
      and column_name = 'target_language'
  ) then
    alter table public.document_translations alter column target_language drop not null;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'document_translations'
      and column_name = 'source_content_hash'
  ) then
    alter table public.document_translations alter column source_content_hash drop not null;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'document_translations'
      and column_name = 'source_text'
  ) then
    alter table public.document_translations alter column source_text drop not null;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'document_translations'
      and column_name = 'translated_text'
  ) then
    alter table public.document_translations alter column translated_text drop not null;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'document_translations'
      and column_name = 'model'
  ) then
    alter table public.document_translations alter column model drop not null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'document_translations_status_check'
      and conrelid = 'public.document_translations'::regclass
  ) then
    alter table public.document_translations
      add constraint document_translations_status_check
      check (status in ('queued', 'processing', 'ready', 'failed'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'document_translations_word_count_check'
      and conrelid = 'public.document_translations'::regclass
  ) then
    alter table public.document_translations
      add constraint document_translations_word_count_check
      check (word_count >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'document_translations_document_language_key'
      and conrelid = 'public.document_translations'::regclass
  ) then
    alter table public.document_translations
      add constraint document_translations_document_language_key
      unique (document_id, language_code);
  end if;
end $$;

create index if not exists document_translations_document_id_idx
  on public.document_translations (document_id);

-- Table predates service_role grants used by the library pipeline.
grant select, insert, update, delete on public.document_translations to service_role;
grant select, insert, update, delete on public.document_translations to authenticated;
grant select, insert, update, delete on public.document_translations to anon;
