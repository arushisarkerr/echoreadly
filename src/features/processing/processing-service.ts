/**
 * Document processing service.
 *
 * Handles metadata, status transitions, PDF text extraction, chunking,
 * summarization, and user-scoped Supabase persistence.
 * Document hash reuse is limited to the authenticated owner's documents.
 */

import { downloadPdfBytes } from "@/lib/storage";

import {
  generateDocumentSummary,
  getDefaultAiProvider,
  type SummaryResult,
  type SummaryType,
} from "@/features/ai";
import { trackAnalyticsEventAsync } from "@/features/analytics/track-event";
import {
  requireOwnershipContext,
  type OwnershipContext,
} from "@/features/auth/ownership";
import {
  documentRowToProcessed,
  getDocumentByHash,
  getDocumentById,
  getDocumentSummaryByType,
  hashDocumentBytes,
  listChunksByDocumentId,
  replaceDocumentChunks,
  rowsToChunkResult,
  summaryRowToResult,
  updateDocumentFields,
  upsertDocument,
  upsertDocumentSummary,
} from "@/features/persistence";

import {
  createDocument,
  toDocumentMetadata,
  withPageCount,
  withProcessingStatus,
} from "./document";
import {
  chunkDocumentText,
  type DocumentChunkResult,
} from "./document-chunks";
import {
  documentTextStore,
  type DocumentTextResult,
} from "./document-text";
import { extractTextFromDocumentBytes, resolveFormatFromPath } from "./extract-text";
import type {
  CreateDocumentInput,
  DocumentMetadata,
  ProcessedDocument,
  ProcessingResult,
  ProcessingStatus,
} from "./types";

const TERMINAL_STATUSES: ReadonlySet<ProcessingStatus> = new Set([
  "ready",
  "failed",
]);

/**
 * In-memory processing registry (request-local cache).
 * Canonical state lives in Supabase under the owning user.
 */
const documentsById = new Map<string, ProcessedDocument>();

function getDocumentOrError(
  documentId: string,
): ProcessingResult<ProcessedDocument> {
  const document = documentsById.get(documentId);

  if (!document) {
    return {
      ok: false,
      error: `Document not found: ${documentId}`,
    };
  }

  return { ok: true, data: document };
}

function saveDocument(document: ProcessedDocument): ProcessedDocument {
  documentsById.set(document.id, document);
  return document;
}

async function resolveOwnership(): Promise<
  ProcessingResult<OwnershipContext>
> {
  const ownership = await requireOwnershipContext();
  if (!ownership.ok) {
    return { ok: false, error: ownership.error };
  }
  return { ok: true, data: ownership.data };
}

async function hydrateDocumentFromPersistence(
  documentId: string,
  ownership?: OwnershipContext,
): Promise<ProcessingResult<ProcessedDocument>> {
  const cached = documentsById.get(documentId);
  if (cached) {
    return { ok: true, data: cached };
  }

  let context = ownership;
  if (!context) {
    const resolved = await resolveOwnership();
    if (!resolved.ok) {
      return resolved;
    }
    context = resolved.data;
  }

  const { userId, client } = context;
  const row = await getDocumentById(documentId, userId, client);
  if (!row.ok) {
    return { ok: false, error: row.error };
  }

  if (!row.data) {
    return { ok: false, error: `Document not found: ${documentId}` };
  }

  const document = documentRowToProcessed(row.data);

  const chunks = await listChunksByDocumentId(documentId, userId, client);
  if (chunks.ok && chunks.data.length > 0) {
    const chunkResult = rowsToChunkResult(
      chunks.data,
      document.pageCount ?? 0,
      document.chunkedAt,
    );
    document.chunks = chunkResult.chunks;
    document.chunkedAt = chunkResult.chunkedAt;
  }

  return { ok: true, data: saveDocument(document) };
}

/**
 * Register a newly uploaded PDF with the processing pipeline.
 */
export function registerUploadedDocument(
  input: CreateDocumentInput,
): ProcessingResult<ProcessedDocument> {
  if (!input.storagePath.trim()) {
    return { ok: false, error: "storagePath is required." };
  }

  if (!input.originalFileName.trim()) {
    return { ok: false, error: "originalFileName is required." };
  }

  if (!Number.isFinite(input.fileSize) || input.fileSize < 0) {
    return { ok: false, error: "fileSize must be a non-negative number." };
  }

  const document = saveDocument(createDocument(input));
  return { ok: true, data: document };
}

/**
 * Mark a document as processing.
 */
export function startDocumentProcessing(
  documentId: string,
): ProcessingResult<ProcessedDocument> {
  const current = getDocumentOrError(documentId);
  if (!current.ok) {
    return current;
  }

  if (current.data.processingStatus === "failed") {
    // Allow retry from failed.
  } else if (TERMINAL_STATUSES.has(current.data.processingStatus)) {
    return {
      ok: false,
      error: `Cannot process a document in status "${current.data.processingStatus}".`,
    };
  }

  const updated = saveDocument(
    withProcessingStatus(current.data, "processing"),
  );

  return { ok: true, data: updated };
}

/**
 * Attach page-count metadata.
 */
export function setDocumentPageCount(
  documentId: string,
  pageCount: number,
): ProcessingResult<ProcessedDocument> {
  if (!Number.isInteger(pageCount) || pageCount < 0) {
    return { ok: false, error: "pageCount must be a non-negative integer." };
  }

  const current = getDocumentOrError(documentId);
  if (!current.ok) {
    return current;
  }

  const updated = saveDocument(withPageCount(current.data, pageCount));
  return { ok: true, data: updated };
}

/**
 * Mark processing as successfully completed.
 */
export function markDocumentReady(
  documentId: string,
): ProcessingResult<ProcessedDocument> {
  const current = getDocumentOrError(documentId);
  if (!current.ok) {
    return current;
  }

  const updated = saveDocument(withProcessingStatus(current.data, "ready"));
  return { ok: true, data: updated };
}

/**
 * Mark processing as failed.
 */
export function markDocumentFailed(
  documentId: string,
): ProcessingResult<ProcessedDocument> {
  const current = getDocumentOrError(documentId);
  if (!current.ok) {
    return current;
  }

  const updated = saveDocument(withProcessingStatus(current.data, "failed"));

  if (current.data.userId) {
    void updateDocumentFields(documentId, current.data.userId, {
      processingStatus: "failed",
    });
  }

  return { ok: true, data: updated };
}

/**
 * Read a document record by id (memory, then persistence).
 */
export async function getDocument(
  documentId: string,
): Promise<ProcessingResult<ProcessedDocument>> {
  return hydrateDocumentFromPersistence(documentId);
}

/**
 * Read document metadata only.
 */
export async function getDocumentMetadata(
  documentId: string,
): Promise<ProcessingResult<DocumentMetadata>> {
  const current = await hydrateDocumentFromPersistence(documentId);
  if (!current.ok) {
    return current;
  }

  return { ok: true, data: toDocumentMetadata(current.data) };
}

/**
 * List all registered documents from the in-memory cache (newest first).
 */
export function listDocuments(): ProcessedDocument[] {
  return Array.from(documentsById.values()).sort((a, b) =>
    b.uploadedAt.localeCompare(a.uploadedAt),
  );
}

/**
 * Clear the in-memory registry and extracted text store.
 */
export function resetProcessingRegistry(): void {
  documentsById.clear();
  documentTextStore.clear();
}

/**
 * Drop in-memory processing state for a storage path (after user delete).
 */
export function forgetDocumentByStoragePath(storagePath: string): void {
  const normalize = (value: string) => {
    const trimmed = value.replace(/^\/+/, "").trim();
    return trimmed.startsWith("pdfs/") ? trimmed.slice("pdfs/".length) : trimmed;
  };

  const target = normalize(storagePath);

  for (const [id, doc] of documentsById.entries()) {
    if (normalize(doc.storagePath) === target) {
      documentsById.delete(id);
      documentTextStore.delete?.(id);
    }
  }
}

/**
 * Download a registered PDF from Storage and extract readable text.
 * Updates in-memory state and persists document metadata for the owner.
 */
export async function extractDocumentText(
  documentId: string,
  pdfBytes?: Uint8Array,
): Promise<ProcessingResult<ProcessedDocument>> {
  const ownership = await resolveOwnership();
  if (!ownership.ok) {
    return ownership;
  }

  const { userId, client } = ownership.data;
  const current = await hydrateDocumentFromPersistence(documentId, ownership.data);
  if (!current.ok) {
    return current;
  }

  const working = saveDocument(
    withProcessingStatus(
      { ...current.data, userId: current.data.userId ?? userId },
      "processing",
    ),
  );
  await updateDocumentFields(
    documentId,
    userId,
    { processingStatus: "processing" },
    client,
  );

  let bytes = pdfBytes ?? null;

  if (!bytes) {
    const download = await downloadPdfBytes(working.storagePath, client);
    if (!download.data) {
      markDocumentFailed(documentId);
      return {
        ok: false,
        error: download.error || "Unable to download PDF from storage.",
      };
    }
    bytes = download.data;
  }

  const documentHash = hashDocumentBytes(bytes);
  const format = resolveFormatFromPath(
    working.originalFileName || working.storagePath,
  );
  const extraction = await extractTextFromDocumentBytes(bytes, format);

  if (!extraction.ok) {
    markDocumentFailed(documentId);
    return {
      ok: false,
      error: extraction.error.message,
    };
  }

  documentTextStore.save(documentId, extraction.data);

  const withText: ProcessedDocument = {
    ...working,
    userId,
    documentHash,
    pageCount: extraction.data.pageCount,
    extractedText: extraction.data.fullText,
    pageTexts: extraction.data.pages,
    extractedAt: extraction.data.extractedAt,
    chunks: working.chunks,
    chunkedAt: working.chunkedAt,
    processingStatus: "processing",
  };

  saveDocument(withText);

  const persisted = await upsertDocument(
    {
      id: withText.id,
      userId,
      storagePath: withText.storagePath,
      originalFileName: withText.originalFileName,
      fileSize: withText.fileSize || bytes.byteLength,
      uploadedAt: withText.uploadedAt,
      pageCount: withText.pageCount,
      processingStatus: "processing",
      documentHash,
      extractedAt: withText.extractedAt,
      chunkedAt: withText.chunkedAt,
    },
    client,
  );

  if (!persisted.ok) {
    markDocumentFailed(documentId);
    return { ok: false, error: persisted.error };
  }

  // Same-user hash collision with a different id should adopt the persisted row.
  if (persisted.data.id !== documentId) {
    documentsById.delete(documentId);
    const adopted = documentRowToProcessed(persisted.data);
    adopted.extractedText = withText.extractedText;
    adopted.pageTexts = withText.pageTexts;
    documentTextStore.save(adopted.id, extraction.data);
    saveDocument(adopted);
    return { ok: true, data: adopted };
  }

  return { ok: true, data: withText };
}

function resolveDocumentText(
  document: ProcessedDocument,
): DocumentTextResult | null {
  const stored = documentTextStore.get(document.id);

  if (stored) {
    return stored;
  }

  if (!document.pageTexts || document.pageTexts.length === 0) {
    return null;
  }

  return {
    pages: document.pageTexts,
    fullText: document.extractedText ?? "",
    pageCount: document.pageCount ?? document.pageTexts.length,
    extractedAt: document.extractedAt ?? new Date().toISOString(),
    textSource: "pdfium",
  };
}

/**
 * Generate logical text chunks and persist them to Supabase for the owner.
 */
export async function generateDocumentChunks(
  documentId: string,
): Promise<ProcessingResult<DocumentChunkResult>> {
  const ownership = await resolveOwnership();
  if (!ownership.ok) {
    return ownership;
  }

  const { userId, client } = ownership.data;
  const current = await hydrateDocumentFromPersistence(documentId, ownership.data);
  if (!current.ok) {
    return current;
  }

  if (current.data.chunks && current.data.chunks.length > 0) {
    return {
      ok: true,
      data: {
        chunks: current.data.chunks,
        chunkCount: current.data.chunks.length,
        pageCount: current.data.pageCount ?? 0,
        characterCount: current.data.chunks.reduce(
          (total, chunk) => total + chunk.characterCount,
          0,
        ),
        chunkedAt: current.data.chunkedAt ?? new Date().toISOString(),
      },
    };
  }

  const persistedChunks = await listChunksByDocumentId(
    documentId,
    userId,
    client,
  );
  if (persistedChunks.ok && persistedChunks.data.length > 0) {
    const chunkResult = rowsToChunkResult(
      persistedChunks.data,
      current.data.pageCount ?? 0,
      current.data.chunkedAt,
    );

    saveDocument({
      ...current.data,
      userId,
      chunks: chunkResult.chunks,
      chunkedAt: chunkResult.chunkedAt,
      processingStatus: "ready",
    });

    return { ok: true, data: chunkResult };
  }

  const documentText = resolveDocumentText(current.data);

  if (!documentText) {
    return {
      ok: false,
      error: "Document has no extracted text to chunk. Run extraction first.",
    };
  }

  const chunked = chunkDocumentText(documentText, {
    idPrefix: documentId,
  });

  if (!chunked.ok) {
    return {
      ok: false,
      error: chunked.error.message,
    };
  }

  const savedChunks = await replaceDocumentChunks(
    documentId,
    userId,
    chunked.data.chunks.map((chunk) => ({
      pageNumber: chunk.pageNumber,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      characterCount: chunk.characterCount,
    })),
    client,
  );

  if (!savedChunks.ok) {
    return { ok: false, error: savedChunks.error };
  }

  const chunkedAt = chunked.data.chunkedAt;

  await updateDocumentFields(
    documentId,
    userId,
    {
      pageCount: chunked.data.pageCount,
      processingStatus: "ready",
      chunkedAt,
      extractedAt: current.data.extractedAt,
    },
    client,
  );

  saveDocument({
    ...current.data,
    userId,
    pageCount: chunked.data.pageCount,
    chunks: chunked.data.chunks,
    chunkedAt,
    processingStatus: "ready",
  });

  return { ok: true, data: chunked.data };
}

/**
 * Read previously generated chunks for a document (memory, then DB).
 */
export async function getDocumentChunks(
  documentId: string,
): Promise<ProcessingResult<DocumentChunkResult>> {
  return generateDocumentChunks(documentId);
}

export type EnsureDocumentProcessedInput = {
  storagePath: string;
  originalFileName: string;
  fileSize?: number;
};

export type EnsureDocumentProcessedResult = {
  document: ProcessedDocument;
  chunks: DocumentChunkResult;
  reused: boolean;
};

/**
 * Ensure a PDF is extracted, chunked, and persisted for the current user.
 * Reuses existing processing only when the same user already owns that hash.
 */
export async function ensureDocumentProcessed(
  input: EnsureDocumentProcessedInput,
): Promise<ProcessingResult<EnsureDocumentProcessedResult>> {
  if (!input.storagePath.trim()) {
    return { ok: false, error: "storagePath is required." };
  }

  if (!input.originalFileName.trim()) {
    return { ok: false, error: "originalFileName is required." };
  }

  const ownership = await resolveOwnership();
  if (!ownership.ok) {
    return ownership;
  }

  const { userId, client } = ownership.data;

  const download = await downloadPdfBytes(input.storagePath, client);
  if (!download.data) {
    return {
      ok: false,
      error: download.error || "Unable to download PDF from storage.",
    };
  }

  const documentHash = hashDocumentBytes(download.data);
  const fileSize = input.fileSize ?? download.data.byteLength;

  const existing = await getDocumentByHash(documentHash, userId, client);
  if (!existing.ok) {
    return { ok: false, error: existing.error };
  }

  if (existing.data && existing.data.processing_status === "ready") {
    const chunks = await listChunksByDocumentId(
      existing.data.id,
      userId,
      client,
    );

    if (chunks.ok && chunks.data.length > 0) {
      if (existing.data.storage_path !== input.storagePath) {
        await updateDocumentFields(
          existing.data.id,
          userId,
          {
            storagePath: input.storagePath,
            originalFileName: input.originalFileName,
            fileSize,
          },
          client,
        );
      }

      const document = documentRowToProcessed({
        ...existing.data,
        storage_path: input.storagePath,
        original_file_name: input.originalFileName,
        file_size: fileSize,
      });

      const chunkResult = rowsToChunkResult(
        chunks.data,
        document.pageCount ?? 0,
        document.chunkedAt,
      );

      document.chunks = chunkResult.chunks;
      document.chunkedAt = chunkResult.chunkedAt;
      saveDocument(document);

      return {
        ok: true,
        data: {
          document,
          chunks: chunkResult,
          reused: true,
        },
      };
    }
  }

  const upserted = await upsertDocument(
    {
      id: existing.data?.id,
      userId,
      storagePath: input.storagePath,
      originalFileName: input.originalFileName,
      fileSize,
      uploadedAt: existing.data?.uploaded_at,
      pageCount: existing.data?.page_count ?? null,
      processingStatus: "processing",
      documentHash,
      extractedAt: existing.data?.extracted_at ?? null,
      chunkedAt: null,
    },
    client,
  );

  if (!upserted.ok) {
    return { ok: false, error: upserted.error };
  }

  const registered = saveDocument({
    ...documentRowToProcessed(upserted.data),
    processingStatus: "processing",
  });

  // Own a stable byte copy for the native PDFium load lifetime.
  const pdfBytes = new Uint8Array(download.data);

  const extracted = await extractDocumentText(registered.id, pdfBytes);
  if (!extracted.ok) {
    return extracted;
  }

  const chunked = await generateDocumentChunks(extracted.data.id);
  if (!chunked.ok) {
    markDocumentFailed(extracted.data.id);
    return chunked;
  }

  const document = documentsById.get(extracted.data.id) ?? extracted.data;

  trackAnalyticsEventAsync({
    userId,
    eventName: "document_processed",
    documentId: document.id,
    storagePath: document.storagePath,
    label: `Processed ${document.originalFileName}`,
    metadata: {
      pageCount: document.pageCount,
      chunkCount: chunked.data.chunkCount,
    },
  });

  return {
    ok: true,
    data: {
      document,
      chunks: chunked.data,
      reused: false,
    },
  };
}

/**
 * Generate an AI summary from processed chunks, reusing the owner's persisted summaries.
 */
export async function summarizeDocument(
  documentId: string,
  summaryType: SummaryType = "short",
  options?: { regenerate?: boolean },
): Promise<ProcessingResult<SummaryResult>> {
  const ownership = await resolveOwnership();
  if (!ownership.ok) {
    return ownership;
  }

  const { userId, client } = ownership.data;
  const current = await hydrateDocumentFromPersistence(
    documentId,
    ownership.data,
  );
  if (!current.ok) {
    return current;
  }

  const regenerate = options?.regenerate === true;

  if (!regenerate) {
    const existingSummary = await getDocumentSummaryByType(
      documentId,
      userId,
      summaryType,
      client,
    );

    if (existingSummary.ok && existingSummary.data) {
      const result = summaryRowToResult(existingSummary.data);
      saveDocument({
        ...current.data,
        summary: result.content,
      });
      return { ok: true, data: result };
    }
  }

  const chunks = await getDocumentChunks(documentId);
  if (!chunks.ok) {
    return chunks;
  }

  const summary = await generateDocumentSummary({
    documentId,
    chunks: chunks.data,
    summaryType,
    documentTitle: current.data.originalFileName,
    provider: getDefaultAiProvider(),
  });

  if (!summary.ok) {
    return {
      ok: false,
      error: summary.error.message,
    };
  }

  const persisted = await upsertDocumentSummary(
    {
      userId,
      documentId,
      summaryType,
      content: summary.data.content,
      citations: summary.data.sections,
      model: summary.data.model,
      generatedAt: summary.data.generatedAt,
    },
    client,
  );

  if (!persisted.ok) {
    return { ok: false, error: persisted.error };
  }

  saveDocument({
    ...current.data,
    summary: summary.data.content,
  });

  return { ok: true, data: summaryRowToResult(persisted.data) };
}
