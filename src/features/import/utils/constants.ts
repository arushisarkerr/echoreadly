import {
  DOCUMENT_ACCEPT,
  DOCUMENT_MAX_BYTES,
} from "@/features/import/formats/registry";

/** @deprecated Use DOCUMENT_MAX_BYTES */
export const PDF_MAX_BYTES = DOCUMENT_MAX_BYTES;

/** Multi-format accept string (PDF, DOCX, EPUB, TXT). */
export const PDF_ACCEPT = DOCUMENT_ACCEPT;

export const DOCUMENT_ACCEPT_ATTR = DOCUMENT_ACCEPT;

export const PDF_MIME = "application/pdf" as const;

export const PDF_EXTENSION = ".pdf" as const;

/** IndexedDB database used to stage imported PDFs until a remote backend exists. */
export const PDF_STAGING_DB = "echoreadly-pdf-imports";

export const PDF_STAGING_STORE = "pdfs";

export const PDF_STAGING_DB_VERSION = 1;
