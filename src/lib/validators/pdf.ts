/**
 * Client-side PDF upload validation.
 * Checks MIME type / extension and size only — does not parse PDF contents or upload.
 */

import {
  ACCEPTED_PDF_MIME,
  MAX_PDF_UPLOAD_BYTES,
  MAX_PDF_UPLOAD_LABEL,
} from "@/constants";

export type PdfValidationError = "not_pdf" | "too_large" | "empty";

export type ValidatedPdfFile = {
  name: string;
  size: number;
  type: string;
};

export type PdfValidationResult =
  | { ok: true; file: ValidatedPdfFile }
  | { ok: false; error: PdfValidationError };

function hasPdfExtension(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".pdf");
}

/**
 * True when the browser reports `application/pdf`, or when MIME is missing
 * and the filename ends with `.pdf` (common on some OS / mobile pickers).
 */
export function isPdfFile(file: File): boolean {
  if (file.type === ACCEPTED_PDF_MIME) {
    return true;
  }

  // Some environments leave type empty for otherwise valid PDFs.
  if (!file.type && hasPdfExtension(file.name)) {
    return true;
  }

  return false;
}

/**
 * Validate a candidate upload against EchoReadly PDF rules.
 * Accepts only PDF up to {@link MAX_PDF_UPLOAD_BYTES}, rejects empty files.
 */
export function validatePdfFile(file: File): PdfValidationResult {
  if (!isPdfFile(file)) {
    return { ok: false, error: "not_pdf" };
  }

  if (file.size <= 0) {
    return { ok: false, error: "empty" };
  }

  if (file.size > MAX_PDF_UPLOAD_BYTES) {
    return { ok: false, error: "too_large" };
  }

  return {
    ok: true,
    file: {
      name: file.name,
      size: file.size,
      type: file.type || ACCEPTED_PDF_MIME,
    },
  };
}

/** User-facing copy for PDF validation failures. */
export function getPdfValidationMessage(error: PdfValidationError): string {
  switch (error) {
    case "not_pdf":
      return "Not a PDF. Only application/pdf files are accepted.";
    case "empty":
      return "This file is empty. Choose a PDF with content.";
    case "too_large":
      return `File too large. Maximum size is ${MAX_PDF_UPLOAD_LABEL}.`;
  }
}
