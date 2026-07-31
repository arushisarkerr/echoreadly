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
  const rawPages = Array.isArray(extracted.text)
    ? extracted.text.map((page) => String(page ?? "").trim())
    : [String(extracted.text ?? "").trim()];
  const pages = rawPages
    .map((pageText, index) => ({
      pageNumber: index + 1,
      text: pageText,
    }))
    .filter((page) => page.text.length > 0);
  const text = pages.map((page) => page.text).join("\n\n");

  return {
    text,
    pageCount:
      typeof extracted.totalPages === "number"
        ? extracted.totalPages
        : rawPages.length || null,
    title: null,
    pages,
  };
}
