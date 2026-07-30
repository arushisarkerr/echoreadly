/**
 * PDF parsing — PDFium character-level text adapter.
 */

export {
  assemblePageTextFromChars,
  extractPagesWithPdfium,
  type PdfiumAssembleMode,
  type PdfiumExtractError,
  type PdfiumExtractErrorCode,
  type PdfiumExtractOptions,
  type PdfiumExtractResult,
} from "./pdfium-adapter";
export {
  probePdfiumNative,
  withPdfium,
  type PdfiumApi,
  type PdfiumNativeProbe,
  type PdfiumPointer,
} from "./pdfium-bindings";
export {
  assemblePageTextWithGeometry,
  formsSingleGrapheme,
  type PdfiumCharGeometry,
} from "./pdfium-geometry";
export {
  DEFAULT_PDFIUM_LINE_TOLERANCE,
  DEFAULT_PDFIUM_SPACE_THRESHOLD,
  resolvePdfiumGeometryOptions,
  type PdfiumGeometryOptions,
} from "./pdfium-geometry-options";
export {
  probePdfiumLibrary,
  resolvePdfiumLibraryPath,
  type PdfiumLibraryProbe,
} from "./pdfium-library";
