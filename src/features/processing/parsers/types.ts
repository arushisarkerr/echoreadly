/**
 * Shared parser/extractor output — every source extractor returns this shape.
 */

export type DocumentParseResult = {
  text: string;
  pageCount: number | null;
  title: string | null;
  metadata?: Record<string, unknown>;
};

export type DocumentParser = (
  bytes: Uint8Array,
  filename: string,
) => Promise<DocumentParseResult>;
