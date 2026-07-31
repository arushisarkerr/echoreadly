import type { DocumentParseResult } from "@/features/processing/parsers/types";

/**
 * Plain text parser.
 */
export async function parseTxt(
  bytes: Uint8Array,
  filename: string,
): Promise<DocumentParseResult> {
  void filename;
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes).trim();

  return {
    text,
    pageCount: text ? Math.max(1, Math.ceil(text.length / 3000)) : 1,
    title: null,
  };
}
