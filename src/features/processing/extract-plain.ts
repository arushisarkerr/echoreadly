/**
 * Extract text from plain TXT / Markdown bytes into the document model.
 */

import {
  createDocumentTextResult,
  documentTextHasContent,
  type DocumentTextResult,
} from "./document-text";
import type { TextExtractionResult } from "./extract-text";
import { splitTextIntoVirtualPages } from "./split-virtual-pages";

function decodeUtf8(data: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(data);
  } catch {
    return "";
  }
}

/**
 * Extract readable text from UTF-8 plain text or Markdown bytes.
 */
export function extractTextFromPlainBytes(
  data: Uint8Array,
  source: "plain" | "markdown",
): TextExtractionResult {
  const text = decodeUtf8(data);
  if (!text.trim()) {
    return {
      ok: false,
      error: {
        code: "empty_pdf",
        message:
          source === "markdown"
            ? "This Markdown file has no readable text."
            : "This text file has no readable content.",
      },
    };
  }

  // Strip UTF-8 BOM if present.
  const cleaned = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const pages = splitTextIntoVirtualPages(cleaned);
  const result: DocumentTextResult = createDocumentTextResult(
    pages,
    pages.length,
    source,
  );

  if (!documentTextHasContent(result)) {
    return {
      ok: false,
      error: {
        code: "empty_pdf",
        message: "No readable text was found in this file.",
      },
    };
  }

  return { ok: true, data: result };
}
