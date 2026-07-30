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
  deleteDocumentsByStoragePath,
  getDocumentByHash,
  getDocumentById,
  getDocumentByStoragePath,
  updateDocumentFields,
  upsertDocument,
} from "./documents";
export { hashDocumentBytes, isDocumentHash } from "./hash-document";
export {
  deleteListeningProgressByStoragePath,
  getListeningProgressByStoragePath,
  listeningProgressPercent,
  listListeningProgressForUser,
  upsertListeningProgress,
} from "./progress";
export {
  normalizeStoragePath,
  uniqueStoragePathVariants,
} from "./storage-path";
export {
  getDocumentSummaryByType,
  summaryRowToResult,
  upsertDocumentSummary,
} from "./summaries";
export type {
  DocumentChunkRow,
  DocumentListeningProgressRow,
  DocumentRow,
  DocumentSummaryRow,
  ListeningProgressPlaybackSource,
  PersistChunkInput,
  PersistSummaryInput,
  PersistenceResult,
  UpsertDocumentInput,
  UpsertListeningProgressInput,
} from "./types";
