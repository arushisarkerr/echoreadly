import { extractText, getDocumentProxy } from "unpdf";

import type { DocumentParseResult } from "@/features/processing/parsers/types";

/**
 * PDF parser — page text via unpdf (pdf.js).
 */
export async function parsePdf(
  bytes: Uint8Array,
  filename: string,
): Promise<DocumentParseResult> {
  void filename;
  const pdf = await getDocumentProxy(bytes);
  const extracted = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(extracted.text)
    ? extracted.text.map((page) => String(page ?? "").trim())
    : [String(extracted.text ?? "").trim()];
  const text = pages.filter(Boolean).join("\n\n");

  return {
    text,
    pageCount: typeof extracted.totalPages === "number" ? extracted.totalPages : pages.length || null,
    title: null,
  };
}
