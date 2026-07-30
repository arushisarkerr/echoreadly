/**
 * PDF text extraction: PDFium primary, optional Mistral OCR fallback when empty.
 * Does not change PDFium assembly / spacing behaviour.
 * Non-PDF formats dispatch through {@link extractTextFromDocumentBytes}.
 */

import {
  formatFromExtension,
  type DocumentFormat,
} from "@/constants";
import {
  createMistralOcrProvider,
  MistralOcrProvider,
} from "@/features/ocr";
import {
  extractPagesWithPdfium,
  type PdfiumExtractErrorCode,
} from "@/lib/pdf";

import {
  createDocumentTextResult,
  documentTextHasContent,
  needsOcr,
  type DocumentTextResult,
} from "./document-text";
import { extractTextFromDocxBytes } from "./extract-docx";
import { extractTextFromPlainBytes } from "./extract-plain";

export type TextExtractionErrorCode =
  | "corrupted_pdf"
  | "empty_pdf"
  | "unsupported_document"
  | "native_unavailable";

export type TextExtractionError = {
  code: TextExtractionErrorCode;
  message: string;
};

export type TextExtractionResult =
  | { ok: true; data: DocumentTextResult }
  | { ok: false; error: TextExtractionError };

/** User-facing copy when PDFium finds no text and OCR is not configured for launch. */
export const EMPTY_PDF_NO_OCR_MESSAGE =
  "This PDF has no extractable text (it may be scanned or image-only). Upload a text-based PDF instead.";

/** User-facing copy when optional OCR ran but still produced no usable text. */
export const EMPTY_PDF_OCR_UNSUCCESSFUL_MESSAGE =
  "This PDF has no extractable text (it may be scanned or image-only). OCR did not recover usable text. Please upload a text-based PDF with selectable text.";

function mapPdfiumErrorCode(
  code: PdfiumExtractErrorCode,
): TextExtractionErrorCode {
  if (code === "native_error") {
    return "native_unavailable";
  }
  if (
    code === "corrupted_pdf" ||
    code === "empty_pdf" ||
    code === "unsupported_document"
  ) {
    return code;
  }
  return "corrupted_pdf";
}

function isOcrConfigured(): boolean {
  const provider = createMistralOcrProvider();
  return provider instanceof MistralOcrProvider && provider.isConfigured();
}

async function tryMistralOcrFallback(
  data: Uint8Array,
): Promise<DocumentTextResult | null> {
  try {
    const provider = createMistralOcrProvider();
    const ocr = await provider.extractPdf(Buffer.from(data));
    return createDocumentTextResult(
      ocr.pageTexts,
      ocr.pageTexts.length,
      "ocr:mistral",
    );
  } catch {
    // OCR must not fail the request — caller keeps the PDFium result.
    return null;
  }
}

/**
 * Extract full text, per-page text, and page count from PDF bytes.
 * PDFium first; optional Mistral OCR only when configured and text is empty.
 */
export async function extractTextFromPdfBytes(
  data: Uint8Array,
): Promise<TextExtractionResult> {
  const extraction = await extractPagesWithPdfium(data);

  if (!extraction.ok) {
    return {
      ok: false,
      error: {
        code: mapPdfiumErrorCode(extraction.error.code),
        message:
          extraction.error.code === "native_error"
            ? extraction.error.message ||
              "PDF text extraction is unavailable on this server (native PDFium/koffi failed to load)."
            : extraction.error.message,
      },
    };
  }

  const { pageTexts, pageCount } = extraction;
  const pdfiumResult = createDocumentTextResult(pageTexts, pageCount, "pdfium");

  let result = pdfiumResult;
  let ocrAttempted = false;

  if (needsOcr(pdfiumResult) && isOcrConfigured()) {
    ocrAttempted = true;
    const ocrResult = await tryMistralOcrFallback(data);
    if (ocrResult) {
      result = ocrResult;
    }
  }

  if (!documentTextHasContent(result)) {
    return {
      ok: false,
      error: {
        code: "empty_pdf",
        message: ocrAttempted
          ? EMPTY_PDF_OCR_UNSUCCESSFUL_MESSAGE
          : EMPTY_PDF_NO_OCR_MESSAGE,
      },
    };
  }

  return {
    ok: true,
    data: result,
  };
}

/**
 * Dispatch text extraction by document format. PDF path is unchanged.
 */
export async function extractTextFromDocumentBytes(
  data: Uint8Array,
  format: DocumentFormat,
): Promise<TextExtractionResult> {
  switch (format) {
    case "pdf":
      return extractTextFromPdfBytes(data);
    case "docx":
      return extractTextFromDocxBytes(data);
    case "txt":
      return extractTextFromPlainBytes(data, "plain");
    case "markdown":
      return extractTextFromPlainBytes(data, "markdown");
  }
}

/**
 * Resolve format from a storage path or file name, defaulting to PDF when unknown.
 */
export function resolveFormatFromPath(pathOrName: string): DocumentFormat {
  return formatFromExtension(pathOrName) ?? "pdf";
}

export { needsOcr };
