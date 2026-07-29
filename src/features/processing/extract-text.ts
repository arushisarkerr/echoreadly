/**
 * PDF text extraction using unpdf (serverless PDF.js build).
 * No OCR and no AI — embedded text only.
 */

import { extractText, getDocumentProxy } from "unpdf";

import {
  createDocumentTextResult,
  documentTextHasContent,
  type DocumentTextResult,
} from "./document-text";

export type TextExtractionErrorCode =
  | "corrupted_pdf"
  | "empty_pdf"
  | "unsupported_document";

export type TextExtractionError = {
  code: TextExtractionErrorCode;
  message: string;
};

export type TextExtractionResult =
  | { ok: true; data: DocumentTextResult }
  | { ok: false; error: TextExtractionError };

function classifyExtractionError(error: unknown): TextExtractionError {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unable to extract text from this PDF.";

  const normalized = message.toLowerCase();

  if (
    normalized.includes("password") ||
    normalized.includes("encrypted") ||
    normalized.includes("unsupported") ||
    normalized.includes("not a pdf")
  ) {
    return {
      code: "unsupported_document",
      message: "This document type is not supported for text extraction.",
    };
  }

  if (
    normalized.includes("invalid pdf") ||
    normalized.includes("format error") ||
    normalized.includes("xref") ||
    normalized.includes("corrupt")
  ) {
    return {
      code: "corrupted_pdf",
      message: "This PDF appears corrupted or unreadable.",
    };
  }

  return {
    code: "corrupted_pdf",
    message: message || "This PDF appears corrupted or unreadable.",
  };
}

/**
 * Extract full text, per-page text, and page count from PDF bytes.
 */
export async function extractTextFromPdfBytes(
  data: Uint8Array,
): Promise<TextExtractionResult> {
  if (data.byteLength === 0) {
    return {
      ok: false,
      error: {
        code: "empty_pdf",
        message: "The PDF file is empty.",
      },
    };
  }

  // PDF files should start with "%PDF"
  const header = String.fromCharCode(
    data[0] ?? 0,
    data[1] ?? 0,
    data[2] ?? 0,
    data[3] ?? 0,
  );

  if (header !== "%PDF") {
    return {
      ok: false,
      error: {
        code: "unsupported_document",
        message: "This document is not a valid PDF.",
      },
    };
  }

  try {
    const pdf = await getDocumentProxy(data);
    const { totalPages, text } = await extractText(pdf, { mergePages: false });

    const pageStrings = Array.isArray(text) ? text : [text];

    if (totalPages <= 0 || pageStrings.length === 0) {
      return {
        ok: false,
        error: {
          code: "empty_pdf",
          message: "The PDF has no pages to extract.",
        },
      };
    }

    const result = createDocumentTextResult(pageStrings, totalPages);

    if (!documentTextHasContent(result)) {
      return {
        ok: false,
        error: {
          code: "empty_pdf",
          message:
            "No readable text was found. Scanned PDFs need OCR (not available yet).",
        },
      };
    }

    return {
      ok: true,
      data: result,
    };
  } catch (error) {
    return {
      ok: false,
      error: classifyExtractionError(error),
    };
  }
}
