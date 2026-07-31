export {
  DOCUMENT_ACCEPT,
  DOCUMENT_FORMATS,
  DOCUMENT_MAX_BYTES,
  OCR_ACCEPT,
  detectDocumentFormat,
  labelForFormat,
  labelForMimeType,
  labelForSourceFormat,
  type DocumentFormatId,
} from "./registry";
export {
  validateDocumentFile,
  type DocumentValidationResult,
} from "./validate-document";
