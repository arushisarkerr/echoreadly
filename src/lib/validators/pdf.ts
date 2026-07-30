/**
 * PDF validators — thin wrappers around multi-format document validation.
 */

export {
  getPdfValidationMessage,
  isPdfFile,
  validatePdfFile,
  type PdfValidationError,
  type PdfValidationResult,
  type ValidatedPdfFile,
} from "./document";
