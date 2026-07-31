/**
 * Shared parser output — format-specific extractors must return this shape.
 */

export type DocumentParseResult = {
  /** Plain text extracted from the document. */
  text: string;
  /** Page or section count when the format supports it. */
  pageCount: number | null;
  /** Optional title from document metadata. */
  title: string | null;
};

export type DocumentParser = (
  bytes: Uint8Array,
  filename: string,
) => Promise<DocumentParseResult>;
