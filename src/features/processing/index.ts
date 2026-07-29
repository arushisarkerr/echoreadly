/**
 * Document processing pipeline.
 * Metadata, status, text extraction, and chunking (no OCR/AI yet).
 */

export {
  CHUNK_MAX_CHARS,
  CHUNK_MIN_CHARS,
  CHUNK_TARGET_CHARS,
  chunkPageText,
  chunkPages,
  splitIntoParagraphs,
  type ChunkTextOptions,
  type DocumentChunk,
} from "./chunk-text";
export {
  createDocument,
  toDocumentMetadata,
  withPageCount,
  withProcessingStatus,
} from "./document";
export {
  chunkDocumentText,
  createDocumentChunkResult,
  type ChunkDocumentError,
  type ChunkDocumentErrorCode,
  type ChunkDocumentResult,
  type DocumentChunkResult,
} from "./document-chunks";
export {
  createDocumentTextResult,
  documentTextHasContent,
  documentTextStore,
  InMemoryDocumentTextStore,
  type DocumentTextResult,
  type DocumentTextStore,
} from "./document-text";
export {
  extractTextFromPdfBytes,
  type TextExtractionError,
  type TextExtractionErrorCode,
  type TextExtractionResult,
} from "./extract-text";
export {
  createPageTexts,
  isEmptyPageTextSet,
  joinPageTexts,
  type PageText,
} from "./page-text";
export {
  ensureDocumentProcessed,
  extractDocumentText,
  generateDocumentChunks,
  getDocument,
  getDocumentChunks,
  getDocumentMetadata,
  listDocuments,
  markDocumentFailed,
  markDocumentReady,
  registerUploadedDocument,
  resetProcessingRegistry,
  setDocumentPageCount,
  startDocumentProcessing,
  summarizeDocument,
  type EnsureDocumentProcessedInput,
  type EnsureDocumentProcessedResult,
} from "./processing-service";
export type {
  CreateDocumentInput,
  DocumentMetadata,
  DocumentProcessingExtensions,
  ProcessedDocument,
  ProcessingResult,
  ProcessingStatus,
} from "./types";
