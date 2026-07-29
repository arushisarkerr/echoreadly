/**
 * Document persistence layer — Supabase-backed metadata, chunks, and summaries.
 */

export {
  chunkRowToDocumentChunk,
  listChunksByDocumentId,
  replaceDocumentChunks,
  rowsToChunkResult,
} from "./chunks";
export {
  documentRowToProcessed,
  getDocumentByHash,
  getDocumentById,
  getDocumentByStoragePath,
  updateDocumentFields,
  upsertDocument,
} from "./documents";
export { hashDocumentBytes, isDocumentHash } from "./hash-document";
export {
  getDocumentSummaryByType,
  summaryRowToResult,
  upsertDocumentSummary,
} from "./summaries";
export type {
  DocumentChunkRow,
  DocumentRow,
  DocumentSummaryRow,
  PersistChunkInput,
  PersistSummaryInput,
  PersistenceResult,
  UpsertDocumentInput,
} from "./types";
