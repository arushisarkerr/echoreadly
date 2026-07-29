/**
 * Shared types for the document processing pipeline.
 */

import type { DocumentChunk } from "./chunk-text";
import type { PageText } from "./page-text";

/** Lifecycle status for an uploaded document. */
export type ProcessingStatus =
  | "uploaded"
  | "processing"
  | "ready"
  | "failed";

/** Core metadata persisted (or prepared) for each PDF document. */
export type DocumentMetadata = {
  id: string;
  /** Owning authenticated user id. */
  userId: string | null;
  storagePath: string;
  originalFileName: string;
  fileSize: number;
  uploadedAt: string;
  pageCount: number | null;
  processingStatus: ProcessingStatus;
  /** SHA-256 hex digest of the PDF bytes. */
  documentHash: string | null;
};

/**
 * Extension fields for extraction, chunking, and future AI stages.
 */
export type DocumentProcessingExtensions = {
  /** Full extracted document text. */
  extractedText: string | null;
  /** Per-page extracted text. */
  pageTexts: PageText[] | null;
  /** ISO timestamp when extraction completed. */
  extractedAt: string | null;
  /** Logical text chunks for future AI features. */
  chunks: DocumentChunk[] | null;
  /** ISO timestamp when chunking completed. */
  chunkedAt: string | null;
  /** Populated when AI summarization is implemented. */
  summary: string | null;
};

/** Full in-memory document record used by the processing service. */
export type ProcessedDocument = DocumentMetadata & DocumentProcessingExtensions;

/** Input required to register a newly uploaded PDF with the pipeline. */
export type CreateDocumentInput = {
  storagePath: string;
  originalFileName: string;
  fileSize: number;
  uploadedAt?: string;
  id?: string;
  userId?: string | null;
  pageCount?: number | null;
  documentHash?: string | null;
};

/** Result of a processing-service operation. */
export type ProcessingResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
