-- EchoReadly: grant document_audio access for the TTS pipeline.
--
-- Root cause: public.document_audio was created in
-- 20260731080000_youtube_pipeline_tables.sql without role grants.
-- document_translations later received explicit GRANTs in
-- 20260731091000_document_translations_language_code.sql, so translation
-- works while TTS fails with:
--   permission denied for table document_audio
--
-- TTS uses createServiceClient() (service_role). This is a table privilege
-- issue, not RLS (no RLS policies are defined on document_audio).

grant select, insert, update, delete on public.document_audio to service_role;
grant select, insert, update, delete on public.document_audio to authenticated;
grant select, insert, update, delete on public.document_audio to anon;
