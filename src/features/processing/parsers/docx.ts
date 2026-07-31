import mammoth from "mammoth";

import type { DocumentParseResult } from "@/features/processing/parsers/types";

/**
 * DOCX parser — plain text via mammoth.
 */
export async function parseDocx(
  bytes: Uint8Array,
  filename: string,
): Promise<DocumentParseResult> {
  void filename;
  const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
  const text = (result.value ?? "").trim();

  return {
    text,
    pageCount: text ? Math.max(1, Math.ceil(text.length / 3000)) : null,
    title: null,
  };
}
