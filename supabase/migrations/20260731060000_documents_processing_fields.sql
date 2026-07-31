-- EchoReadly: document processing fields for multi-format import pipeline.
-- Status remains uploaded|processing|ready|failed (UI labels: Queued|Processing|Completed|Failed).

alter table public.documents
  add column if not exists page_count integer;

alter table public.documents
  add column if not exists extracted_text text;

alter table public.documents
  add column if not exists extracted_at timestamptz;

alter table public.documents
  add column if not exists source_format text;
