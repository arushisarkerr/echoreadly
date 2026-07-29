/**
 * PDFium text adapter.
 *
 * Character iteration policy (Phase 1):
 * - FPDFText_GetUnicode for each index
 * - Skip generated U+0020 (FPDFText_IsGenerated === 1)
 * - Keep generated newlines and all non-generated codepoints
 * - Never call FPDFText_GetText
 * - No regex, script heuristics, geometry, OCR, or AI repair
 */

import { assertServerRuntime } from "@/utils/server";

import { withPdfium, type PdfiumApi, type PdfiumPointer } from "./pdfium-bindings";

const GENERATED_SPACE = 0x20;

export type PdfiumExtractErrorCode =
  | "corrupted_pdf"
  | "empty_pdf"
  | "unsupported_document"
  | "native_error";

export type PdfiumExtractError = {
  code: PdfiumExtractErrorCode;
  message: string;
};

export type PdfiumExtractResult =
  | { ok: true; pageTexts: string[]; pageCount: number }
  | { ok: false; error: PdfiumExtractError };

function appendCodePoint(parts: string[], codePoint: number): void {
  if (codePoint === 0) {
    return;
  }
  parts.push(String.fromCodePoint(codePoint));
}

/**
 * Build page text from per-character Unicode, skipping generated spaces.
 */
export function assemblePageTextFromChars(
  getUnicode: (index: number) => number,
  isGenerated: (index: number) => number,
  charCount: number,
): string {
  const parts: string[] = [];

  for (let index = 0; index < charCount; index += 1) {
    const codePoint = getUnicode(index) >>> 0;
    const generated = isGenerated(index);

    // Skip only PDFium-synthesized spaces. Keep generated newlines and
    // every real (non-generated) Unicode character.
    if (generated === 1 && codePoint === GENERATED_SPACE) {
      continue;
    }

    appendCodePoint(parts, codePoint);
  }

  return parts.join("");
}

function extractPageText(
  native: PdfiumApi,
  page: PdfiumPointer,
): string {
  const textPage = native.FPDFText_LoadPage(page);
  if (!textPage) {
    return "";
  }

  try {
    const charCount = native.FPDFText_CountChars(textPage);
    if (charCount <= 0) {
      return "";
    }

    return assemblePageTextFromChars(
      (index) => native.FPDFText_GetUnicode(textPage, index),
      (index) => native.FPDFText_IsGenerated(textPage, index),
      charCount,
    );
  } finally {
    native.FPDFText_ClosePage(textPage);
  }
}

function extractAllPages(native: PdfiumApi, data: Uint8Array): {
  pageTexts: string[];
  pageCount: number;
} {
  // Keep `data` alive for the lifetime of the document handle.
  const doc = native.FPDF_LoadMemDocument(data, data.byteLength, null);
  if (!doc) {
    throw Object.assign(new Error("FPDF_LoadMemDocument failed"), {
      code: "corrupted_pdf" as const,
    });
  }

  try {
    const pageCount = native.FPDF_GetPageCount(doc);
    if (pageCount <= 0) {
      throw Object.assign(new Error("PDF has no pages"), {
        code: "empty_pdf" as const,
      });
    }

    const pageTexts: string[] = [];

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const page = native.FPDF_LoadPage(doc, pageIndex);
      if (!page) {
        pageTexts.push("");
        continue;
      }
      try {
        pageTexts.push(extractPageText(native, page));
      } finally {
        native.FPDF_ClosePage(page);
      }
    }

    return { pageTexts, pageCount };
  } finally {
    native.FPDF_CloseDocument(doc);
  }
}

/**
 * Extract per-page text from PDF bytes using the dedicated PDFium adapter.
 */
export async function extractPagesWithPdfium(
  data: Uint8Array,
): Promise<PdfiumExtractResult> {
  assertServerRuntime("PDFium adapter");

  if (data.byteLength === 0) {
    return {
      ok: false,
      error: {
        code: "empty_pdf",
        message: "The PDF file is empty.",
      },
    };
  }

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

  // Copy so callers retain ownership; native load reads this buffer while open.
  const bytes = Uint8Array.from(data);

  try {
    const result = await withPdfium((native) => extractAllPages(native, bytes));
    return { ok: true, ...result };
  } catch (error) {
    const code =
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof (error as { code: unknown }).code === "string"
        ? ((error as { code: PdfiumExtractErrorCode }).code)
        : "native_error";

    const message =
      error instanceof Error
        ? error.message
        : "PDFium failed to extract text from this PDF.";

    return {
      ok: false,
      error: {
        code:
          code === "corrupted_pdf" ||
          code === "empty_pdf" ||
          code === "unsupported_document"
            ? code
            : "native_error",
        message,
      },
    };
  }
}
