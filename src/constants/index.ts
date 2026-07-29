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
  ACCEPTED_PDF_MIME,
  MAX_PDF_UPLOAD_BYTES,
  MAX_PDF_UPLOAD_LABEL,
} from "./limits";
export {
  isAuthPagePath,
  isProtectedPath,
  PROTECTED_PATH_PREFIXES,
  ROUTES,
  type AppRoute,
} from "./routes";
export { PDFS_BUCKET } from "./storage";
