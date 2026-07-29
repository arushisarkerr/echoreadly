/**
 * PDF text extraction via the dedicated PDFium adapter.
 * No OCR and no AI — embedded text only.
 */

import {
  extractPagesWithPdfium,
  type PdfiumExtractErrorCode,
} from "@/lib/pdf";

import {
  createDocumentTextResult,
  documentTextHasContent,
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
  | { ok: true; data: import("./document-text").DocumentTextResult }
  | { ok: false; error: TextExtractionError };

function mapPdfiumErrorCode(
  code: PdfiumExtractErrorCode,
): TextExtractionErrorCode {
  if (
    code === "corrupted_pdf" ||
    code === "empty_pdf" ||
    code === "unsupported_document"
  ) {
    return code;
  }
  return "corrupted_pdf";
}

/**
 * Extract full text, per-page text, and page count from PDF bytes.
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
        message: extraction.error.message,
      },
    };
  }

  const { pageTexts, pageCount } = extraction;
  const result = createDocumentTextResult(pageTexts, pageCount);

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
}
