/**
 * PDF text extraction: PDFium primary, Mistral OCR fallback when empty.
 * Does not change PDFium assembly / spacing behaviour.
 */

import { createMistralOcrProvider } from "@/features/ocr";
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
 * PDFium first; Mistral OCR only when PDFium text is effectively empty.
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
  const pdfiumResult = createDocumentTextResult(pageTexts, pageCount, "pdfium");

  let result = pdfiumResult;

  if (needsOcr(pdfiumResult)) {
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
        message:
          "No readable text was found. Scanned PDFs need OCR, but no usable text could be extracted.",
      },
    };
  }

  return {
    ok: true,
    data: result,
  };
}

export { needsOcr };
