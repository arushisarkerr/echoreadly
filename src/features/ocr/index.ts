/**
 * OCR feature module — provider abstraction for scanned / image-only PDFs.
 * Not wired into the extraction pipeline yet.
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
