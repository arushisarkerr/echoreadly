/**
 * PDF parsing — PDFium character-level text adapter.
 */

export {
  assemblePageTextFromChars,
  extractPagesWithPdfium,
  type PdfiumExtractError,
  type PdfiumExtractErrorCode,
  type PdfiumExtractResult,
} from "./pdfium-adapter";
