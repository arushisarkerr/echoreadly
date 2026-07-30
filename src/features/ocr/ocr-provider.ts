/**
 * Provider-agnostic OCR abstraction.
 * Business logic should depend on this interface, not vendor SDKs.
 */

export type OcrExtractResult = {
  pageTexts: string[];
  fullText: string;
  confidence?: number;
};

/**
 * Minimal PDF OCR contract shared by OCR vendors.
 * Used as a fallback when PDFium extraction yields no usable text.
 */
export interface OcrProvider {
  extractPdf(buffer: Buffer): Promise<OcrExtractResult>;
}
