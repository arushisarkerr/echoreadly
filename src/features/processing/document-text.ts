/**
 * Document-level text extraction result and persistence interfaces.
 * In-memory for Phase 7B; swap the store implementation for database later.
 */

import {
  createPageTexts,
  isEmptyPageTextSet,
  joinPageTexts,
  type PageText,
} from "./page-text";

/** Where extracted text came from. */
export type TextSource =
  | "pdfium"
  | "ocr:mistral"
  | "docx"
  | "plain"
  | "markdown";

/**
 * Extracted text payload for a PDF document.
 * `pages` carries per-page `{ pageNumber, pageText }` records.
 */
export type DocumentTextResult = {
  pages: PageText[];
  fullText: string;
  pageCount: number;
  extractedAt: string;
  textSource: TextSource;
};

/**
 * Persistence boundary for extracted document text.
 * Phase 7B uses an in-memory implementation only.
 */
export interface DocumentTextStore {
  save(documentId: string, text: DocumentTextResult): Promise<void> | void;
  get(
    documentId: string,
  ): Promise<DocumentTextResult | null> | DocumentTextResult | null;
  delete?(documentId: string): Promise<void> | void;
  clear?(): Promise<void> | void;
}

/**
 * Build a document text result from per-page strings.
 */
export function createDocumentTextResult(
  pageStrings: string[],
  pageCount?: number,
  textSource: TextSource = "pdfium",
): DocumentTextResult {
  const pages = createPageTexts(pageStrings);

  return {
    pages,
    fullText: joinPageTexts(pages),
    pageCount: pageCount ?? pages.length,
    extractedAt: new Date().toISOString(),
    textSource,
  };
}

export function documentTextHasContent(result: DocumentTextResult): boolean {
  return result.pageCount > 0 && !isEmptyPageTextSet(result.pages);
}

/**
 * True when PDFium extraction is effectively empty and OCR fallback may run.
 * Never true when any page has non-whitespace text.
 */
export function needsOcr(result: DocumentTextResult): boolean {
  if (result.pageCount <= 0) {
    return true;
  }

  if (result.pages.length === 0) {
    return true;
  }

  if (isEmptyPageTextSet(result.pages)) {
    return true;
  }

  return result.fullText.trim().length === 0;
}

/**
 * In-memory store for extracted text until Supabase persistence ships.
 */
export class InMemoryDocumentTextStore implements DocumentTextStore {
  private readonly records = new Map<string, DocumentTextResult>();

  save(documentId: string, text: DocumentTextResult): void {
    this.records.set(documentId, text);
  }

  get(documentId: string): DocumentTextResult | null {
    return this.records.get(documentId) ?? null;
  }

  delete(documentId: string): void {
    this.records.delete(documentId);
  }

  clear(): void {
    this.records.clear();
  }
}

/** Shared process-local text store for the processing pipeline. */
export const documentTextStore = new InMemoryDocumentTextStore();
