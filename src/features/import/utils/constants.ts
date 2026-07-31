/** Maximum accepted PDF size for import milestone 1. */
export const PDF_MAX_BYTES = 100 * 1024 * 1024;

export const PDF_ACCEPT = "application/pdf,.pdf" as const;

export const PDF_MIME = "application/pdf" as const;

export const PDF_EXTENSION = ".pdf" as const;

/** IndexedDB database used to stage imported PDFs until a remote backend exists. */
export const PDF_STAGING_DB = "echoreadly-pdf-imports";

export const PDF_STAGING_STORE = "pdfs";

export const PDF_STAGING_DB_VERSION = 1;
