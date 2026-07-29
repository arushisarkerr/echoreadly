/**
 * Document model helpers for the processing pipeline.
 * Creates and updates document records without side effects.
 */

import type {
  CreateDocumentInput,
  DocumentMetadata,
  ProcessedDocument,
  ProcessingStatus,
} from "./types";

function createDocumentId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Build a new document record in the `uploaded` state.
 */
export function createDocument(
  input: CreateDocumentInput,
): ProcessedDocument {
  return {
    id: input.id ?? createDocumentId(),
    userId: input.userId ?? null,
    storagePath: input.storagePath,
    originalFileName: input.originalFileName,
    fileSize: input.fileSize,
    uploadedAt: input.uploadedAt ?? new Date().toISOString(),
    pageCount: input.pageCount ?? null,
    processingStatus: "uploaded",
    documentHash: input.documentHash ?? null,
    extractedText: null,
    pageTexts: null,
    extractedAt: null,
    chunks: null,
    chunkedAt: null,
    summary: null,
  };
}

/**
 * Return a copy of the document with an updated processing status.
 */
export function withProcessingStatus(
  document: ProcessedDocument,
  processingStatus: ProcessingStatus,
): ProcessedDocument {
  return {
    ...document,
    processingStatus,
  };
}

/**
 * Return a copy of the document with page count metadata applied.
 */
export function withPageCount(
  document: ProcessedDocument,
  pageCount: number,
): ProcessedDocument {
  return {
    ...document,
    pageCount,
  };
}

/**
 * Narrow a full document record to its metadata fields.
 */
export function toDocumentMetadata(
  document: ProcessedDocument,
): DocumentMetadata {
  return {
    id: document.id,
    userId: document.userId,
    storagePath: document.storagePath,
    originalFileName: document.originalFileName,
    fileSize: document.fileSize,
    uploadedAt: document.uploadedAt,
    pageCount: document.pageCount,
    processingStatus: document.processingStatus,
    documentHash: document.documentHash,
  };
}
