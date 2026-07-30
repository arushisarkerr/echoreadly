/**
 * Document-level chunk results for future AI features.
 * In-memory generation only — no database or vector store.
 */

import {
  chunkPages,
  type ChunkTextOptions,
  type DocumentChunk,
} from "./chunk-text";
import type { DocumentTextResult } from "./document-text";
import { documentTextHasContent } from "./document-text";

export type ChunkDocumentErrorCode =
  | "empty_document"
  | "no_extractable_text"
  | "chunking_failed";

export type ChunkDocumentError = {
  code: ChunkDocumentErrorCode;
  message: string;
};

/**
 * Reusable chunk payload produced from a DocumentTextResult.
 */
export type DocumentChunkResult = {
  chunks: DocumentChunk[];
  chunkCount: number;
  pageCount: number;
  characterCount: number;
  chunkedAt: string;
};

export type ChunkDocumentResult =
  | { ok: true; data: DocumentChunkResult }
  | { ok: false; error: ChunkDocumentError };

/**
 * Build a DocumentChunkResult from an ordered chunk list.
 */
export function createDocumentChunkResult(
  chunks: DocumentChunk[],
  pageCount: number,
): DocumentChunkResult {
  return {
    chunks,
    chunkCount: chunks.length,
    pageCount,
    characterCount: chunks.reduce(
      (total, chunk) => total + chunk.characterCount,
      0,
    ),
    chunkedAt: new Date().toISOString(),
  };
}

/**
 * Split extracted document text into reusable logical chunks.
 * Handles empty, very small, and large documents.
 */
export function chunkDocumentText(
  documentText: DocumentTextResult,
  options?: ChunkTextOptions,
): ChunkDocumentResult {
  try {
    if (!documentTextHasContent(documentText)) {
      return {
        ok: false,
        error: {
          code: "empty_document",
          message: "Cannot chunk an empty document.",
        },
      };
    }

    const pagesWithText = documentText.pages.filter(
      (page) => page.pageText.trim().length > 0,
    );

    if (pagesWithText.length === 0) {
      return {
        ok: false,
        error: {
          code: "no_extractable_text",
          message:
            "This PDF has no extractable text (it may be scanned or image-only). OCR is not available in this launch. Please upload a text-based PDF with selectable text.",
        },
      };
    }

    const chunks = chunkPages(pagesWithText, options);

    if (chunks.length === 0) {
      return {
        ok: false,
        error: {
          code: "empty_document",
          message: "Chunking produced no usable text chunks.",
        },
      };
    }

    // Very small documents naturally yield a single undersized chunk.
    // Large documents are handled page-by-page with a global chunk index.
    return {
      ok: true,
      data: createDocumentChunkResult(chunks, documentText.pageCount),
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "chunking_failed",
        message:
          error instanceof Error
            ? error.message
            : "Unable to chunk document text.",
      },
    };
  }
}
