/**
 * Extract text from DOCX bytes (mammoth) into the document model.
 */

import mammoth from "mammoth";

import {
  createDocumentTextResult,
  documentTextHasContent,
} from "./document-text";
import type { TextExtractionResult } from "./extract-text";
import { splitTextIntoVirtualPages } from "./split-virtual-pages";

/**
 * Extract readable text from a DOCX file.
 */
export async function extractTextFromDocxBytes(
  data: Uint8Array,
): Promise<TextExtractionResult> {
  try {
    // Mammoth expects a Node Buffer / ArrayBuffer-compatible input.
    const input = Buffer.from(data);
    const result = await mammoth.extractRawText({ buffer: input });
    const text = (result.value ?? "").trim();

    if (!text) {
      return {
        ok: false,
        error: {
          code: "empty_pdf",
          message:
            "This DOCX file has no extractable text. Try a text-based document.",
        },
      };
    }

    const pages = splitTextIntoVirtualPages(text);
    const documentText = createDocumentTextResult(pages, pages.length, "docx");

    if (!documentTextHasContent(documentText)) {
      return {
        ok: false,
        error: {
          code: "empty_pdf",
          message: "No readable text was found in this DOCX file.",
        },
      };
    }

    return { ok: true, data: documentText };
  } catch (error) {
    const message =
      error instanceof Error ? error.message.toLowerCase() : "";

    if (
      message.includes("end of central directory") ||
      message.includes("invalid") ||
      message.includes("corrupt") ||
      message.includes("zip")
    ) {
      return {
        ok: false,
        error: {
          code: "corrupted_pdf",
          message:
            "This DOCX file appears corrupted or is not a valid Word document.",
        },
      };
    }

    return {
      ok: false,
      error: {
        code: "unsupported_document",
        message:
          error instanceof Error
            ? error.message
            : "Unable to extract text from this DOCX file.",
      },
    };
  }
}
