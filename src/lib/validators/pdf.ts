/**
 * Client-side PDF upload validation.
 * Checks MIME type and size only — does not parse PDF contents or upload.
 */

import {
  ACCEPTED_PDF_MIME,
  MAX_PDF_UPLOAD_BYTES,
  MAX_PDF_UPLOAD_LABEL,
} from "@/constants";

export type PdfValidationError = "not_pdf" | "too_large";

export type ValidatedPdfFile = {
  name: string;
  size: number;
  type: string;
};

export type PdfValidationResult =
  | { ok: true; file: ValidatedPdfFile }
  | { ok: false; error: PdfValidationError };

/** True when the browser reports the file as `application/pdf`. */
export function isPdfFile(file: File): boolean {
  return file.type === ACCEPTED_PDF_MIME;
}

/**
 * Validate a candidate upload against EchoReadly PDF rules.
 * Accepts only `application/pdf` up to {@link MAX_PDF_UPLOAD_BYTES}.
 */
export function validatePdfFile(file: File): PdfValidationResult {
  if (!isPdfFile(file)) {
    return { ok: false, error: "not_pdf" };
  }

  if (file.size > MAX_PDF_UPLOAD_BYTES) {
    return { ok: false, error: "too_large" };
  }

  return {
    ok: true,
    file: {
      name: file.name,
      size: file.size,
      type: file.type,
    },
  };
}

/** User-facing copy for PDF validation failures. */
export function getPdfValidationMessage(error: PdfValidationError): string {
  switch (error) {
    case "not_pdf":
      return "Not a PDF. Only application/pdf files are accepted.";
    case "too_large":
      return `File too large. Maximum size is ${MAX_PDF_UPLOAD_LABEL}.`;
  }
}
