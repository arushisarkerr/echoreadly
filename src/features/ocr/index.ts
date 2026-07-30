/**
 * OCR feature module — optional provider for scanned / image-only PDFs.
 * Not a marketed launch feature; used only as a configured fallback.
 */

export type { OcrExtractResult, OcrProvider } from "./ocr-provider";
export {
  createMistralOcrProvider,
  MistralOcrProvider,
  type MistralOcrProviderOptions,
} from "./mistral-ocr-provider";
export {
  OcrProviderError,
  type OcrError,
  type OcrErrorCode,
} from "./types";
