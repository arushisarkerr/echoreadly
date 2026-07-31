-- EchoReadly: align document_chunks with live schema + guest ownership.
--
-- page_number:
--   Keep NOT NULL (PDF page citations stay meaningful).
--   Non-paginated sources (YouTube, Website, TXT, DOCX, image OCR, audio)
--   always write page_number = 1. Paginated sources write real page numbers.
--
-- user_id:
--   Must be nullable for guest imports. Ownership for guests is inherited via
--   document_id → documents.guest_id (same model as documents.user_id).
--   Do NOT invent document_chunks.guest_id.
--
-- Migration 20260731070000 created document_chunks without page_number on
-- fresh installs; production already has page_number NOT NULL from earlier,
-- and user_id may still be NOT NULL from the original auth-only schema.

alter table public.document_chunks
  add column if not exists page_number integer;

update public.document_chunks
set page_number = 1
where page_number is null;

alter table public.document_chunks
  alter column page_number set default 1;

alter table public.document_chunks
  alter column page_number set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'document_chunks_page_number_check'
      and conrelid = 'public.document_chunks'::regclass
  ) then
    alter table public.document_chunks
      add constraint document_chunks_page_number_check
      check (page_number >= 1);
  end if;
end $$;

create index if not exists document_chunks_document_id_page_number_idx
  on public.document_chunks (document_id, page_number);

-- Guest chunks: user_id null; auth chunks may still set user_id.
alter table public.document_chunks
  alter column user_id drop not null;
