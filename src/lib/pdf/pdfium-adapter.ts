/**
 * PDFium text adapter.
 *
 * Phase 1: skip generated U+0020; keep real Unicode + generated newlines.
 * Phase 2: optional script-agnostic geometry spacing (see pdfium-geometry.ts).
 * Never call FPDFText_GetText. No regex, Bangla rules, OCR, or AI repair.
 */

import { assertServerRuntime } from "@/utils/server";

import { withPdfium, type PdfiumApi, type PdfiumPointer } from "./pdfium-bindings";
import {
  assemblePageTextWithGeometry,
  type PdfiumCharGeometry,
} from "./pdfium-geometry";
import {
  resolvePdfiumGeometryOptions,
  type PdfiumGeometryOptions,
} from "./pdfium-geometry-options";

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

export type PdfiumAssembleMode = "phase1" | "phase2";

export type PdfiumExtractOptions = {
  /** Defaults to phase2 (geometry on). Benchmarks may force phase1. */
  mode?: PdfiumAssembleMode;
  geometry?: Partial<PdfiumGeometryOptions>;
};

function appendCodePoint(parts: string[], codePoint: number): void {
  if (codePoint === 0) {
    return;
  }
  parts.push(String.fromCodePoint(codePoint));
}

/**
 * Phase 1 assembly: skip generated spaces only (no geometry).
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

    if (generated === 1 && codePoint === GENERATED_SPACE) {
      continue;
    }

    appendCodePoint(parts, codePoint);
  }

  return parts.join("");
}

function readCharGeometry(
  native: PdfiumApi,
  textPage: PdfiumPointer,
  index: number,
): PdfiumCharGeometry {
  const left = new Float64Array(1);
  const right = new Float64Array(1);
  const bottom = new Float64Array(1);
  const top = new Float64Array(1);
  const originX = new Float64Array(1);
  const originY = new Float64Array(1);

  native.FPDFText_GetCharBox(textPage, index, left, right, bottom, top);
  native.FPDFText_GetCharOrigin(textPage, index, originX, originY);

  return {
    codePoint: native.FPDFText_GetUnicode(textPage, index) >>> 0,
    generated: native.FPDFText_IsGenerated(textPage, index),
    originX: originX[0] ?? 0,
    originY: originY[0] ?? 0,
    left: left[0] ?? 0,
    right: right[0] ?? 0,
    bottom: bottom[0] ?? 0,
    top: top[0] ?? 0,
    fontSize: native.FPDFText_GetFontSize(textPage, index) || 1,
  };
}

function extractPageText(
  native: PdfiumApi,
  page: PdfiumPointer,
  options: PdfiumExtractOptions,
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

    const mode = options.mode ?? "phase2";
    if (mode === "phase1") {
      return assemblePageTextFromChars(
        (index) => native.FPDFText_GetUnicode(textPage, index),
        (index) => native.FPDFText_IsGenerated(textPage, index),
        charCount,
      );
    }

    const chars: PdfiumCharGeometry[] = [];
    for (let index = 0; index < charCount; index += 1) {
      chars.push(readCharGeometry(native, textPage, index));
    }
    return assemblePageTextWithGeometry(chars, options.geometry);
  } finally {
    native.FPDFText_ClosePage(textPage);
  }
}

function extractAllPages(
  native: PdfiumApi,
  data: Uint8Array,
  options: PdfiumExtractOptions,
): {
  pageTexts: string[];
  pageCount: number;
} {
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
        pageTexts.push(extractPageText(native, page, options));
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
  options: PdfiumExtractOptions = {},
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

  const bytes = Uint8Array.from(data);
  // Touch options early so invalid env is visible consistently.
  resolvePdfiumGeometryOptions(options.geometry);

  try {
    const result = await withPdfium((native) =>
      extractAllPages(native, bytes, options),
    );
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
