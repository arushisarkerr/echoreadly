/**
 * Shared input validators and schema definitions.
 * Keep validation rules here so API routes and forms stay consistent.
 */

export {
  getDocumentValidationMessage,
  validateDocumentFile,
  type DocumentValidationError,
  type DocumentValidationResult,
  type ValidatedDocumentFile,
} from "./document";
export {
  getPdfValidationMessage,
  isPdfFile,
  validatePdfFile,
  type PdfValidationError,
  type PdfValidationResult,
  type ValidatedPdfFile,
} from "./pdf";
