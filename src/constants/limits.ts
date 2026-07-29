/**
 * Product limits (file size, page count, rate ceilings, retention windows).
 * Keep numeric caps here so features and validators stay aligned.
 */

/** Maximum PDF upload size in bytes (100 MB). */
export const MAX_PDF_UPLOAD_BYTES = 100 * 1024 * 1024;

/** Human-readable upload size limit for UI copy. */
export const MAX_PDF_UPLOAD_LABEL = "100 MB";

/** Accepted MIME type for PDF uploads. */
export const ACCEPTED_PDF_MIME = "application/pdf";
