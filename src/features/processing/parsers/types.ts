/**
 * Shared parser/extractor output — every source extractor returns this shape.
 */

export type ParsedPageText = {
  pageNumber: number;
  text: string;
};

export type DocumentParseResult = {
  text: string;
  pageCount: number | null;
  title: string | null;
  metadata?: Record<string, unknown>;
  /**
   * Per-page text for paginated sources (PDF, OCR PDF, EPUB spine).
   * When omitted, chunking uses page_number = 1 for the whole stream
   * (YouTube, Website, TXT, DOCX, image OCR, future audio).
   */
  pages?: ParsedPageText[];
};

export type DocumentParser = (
  bytes: Uint8Array,
  filename: string,
) => Promise<DocumentParseResult>;
