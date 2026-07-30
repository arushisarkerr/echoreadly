/**
 * Barrel export for shared constants.
 * Import from `@/constants` rather than deep paths when possible.
 */

export {
  APP_DEFAULT_URL,
  APP_DESCRIPTION,
  APP_NAME,
  APP_TAGLINE,
} from "./app";
export {
  ACCEPTED_DOCUMENT_ACCEPT,
  DOCUMENT_EXTENSIONS,
  DOCUMENT_FORMATS,
  DOCUMENT_MIME_TYPES,
  SUPPORTED_DOCUMENT_FORMATS_LABEL,
  VIRTUAL_PAGE_CHAR_TARGET,
  canonicalMimeForFormat,
  formatFromExtension,
  formatLabel,
  getExtension,
  isSupportedDocumentExtension,
  mimeMatchesFormat,
  resolveDocumentFormat,
  type DocumentFormat,
} from "./formats";
export {
  ACCEPTED_PDF_MIME,
  MAX_DOCUMENT_UPLOAD_BYTES,
  MAX_DOCUMENT_UPLOAD_LABEL,
  MAX_PDF_UPLOAD_BYTES,
  MAX_PDF_UPLOAD_LABEL,
} from "./limits";
export {
  isAuthPagePath,
  isProtectedPath,
  PROTECTED_PATH_PREFIXES,
  readerPathForStorage,
  ROUTES,
  type AppRoute,
} from "./routes";
export {
  AUDIO_EXPORT_SIGNED_URL_EXPIRES_IN,
  AUDIO_EXPORTS_BUCKET,
  PDFS_BUCKET,
} from "./storage";
