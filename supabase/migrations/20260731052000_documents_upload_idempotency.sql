-- EchoReadly: harden guest upload idempotency.
-- Ensures one guest upload attempt (document_hash) cannot insert twice.

create unique index if not exists documents_guest_id_document_hash_key
  on public.documents (guest_id, document_hash)
  where guest_id is not null;
