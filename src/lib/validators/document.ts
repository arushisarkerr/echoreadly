/**
 * Client-side validation for supported document imports (PDF/DOCX/TXT/MD).
 */

import {
  ACCEPTED_PDF_MIME,
  MAX_DOCUMENT_UPLOAD_BYTES,
  MAX_DOCUMENT_UPLOAD_LABEL,
  SUPPORTED_DOCUMENT_FORMATS_LABEL,
  canonicalMimeForFormat,
  resolveDocumentFormat,
  type DocumentFormat,
} from "@/constants";

export type DocumentValidationError =
  | "unsupported_type"
  | "too_large"
  | "empty"
  | "corrupted_meta";

export type ValidatedDocumentFile = {
  name: string;
  size: number;
  type: string;
  format: DocumentFormat;
};

export type DocumentValidationResult =
  | { ok: true; file: ValidatedDocumentFile }
  | { ok: false; error: DocumentValidationError };

/**
 * Validate a candidate upload against EchoReadly import rules.
 */
export function validateDocumentFile(file: File): DocumentValidationResult {
  if (file.size <= 0) {
    return { ok: false, error: "empty" };
  }

  if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
    return { ok: false, error: "too_large" };
  }

  const format = resolveDocumentFormat({
    fileName: file.name,
    mimeType: file.type,
  });

  if (!format) {
    return { ok: false, error: "unsupported_type" };
  }

  return {
    ok: true,
    file: {
      name: file.name,
      size: file.size,
      type: file.type || canonicalMimeForFormat(format),
      format,
    },
  };
}

/** User-facing copy for document validation failures. */
export function getDocumentValidationMessage(
  error: DocumentValidationError,
): string {
  switch (error) {
    case "unsupported_type":
      return `Unsupported file type. Accepted formats: ${SUPPORTED_DOCUMENT_FORMATS_LABEL}.`;
    case "empty":
      return "This file is empty. Choose a document with content.";
    case "too_large":
      return `File too large. Maximum size is ${MAX_DOCUMENT_UPLOAD_LABEL}.`;
    case "corrupted_meta":
      return "This file could not be validated. Try another document.";
  }
}

/** @deprecated Prefer {@link validateDocumentFile}. PDF-only wrapper kept for callers. */
export function validatePdfFile(file: File) {
  const result = validateDocumentFile(file);
  if (!result.ok) {
    return {
      ok: false as const,
      error:
        result.error === "unsupported_type"
          ? ("not_pdf" as const)
          : result.error === "corrupted_meta"
            ? ("not_pdf" as const)
            : result.error,
    };
  }

  if (result.file.format !== "pdf") {
    return { ok: false as const, error: "not_pdf" as const };
  }

  return {
    ok: true as const,
    file: {
      name: result.file.name,
      size: result.file.size,
      type: result.file.type || ACCEPTED_PDF_MIME,
    },
  };
}

export function isPdfFile(file: File): boolean {
  return validatePdfFile(file).ok;
}

export type PdfValidationError = "not_pdf" | "too_large" | "empty";
export type ValidatedPdfFile = {
  name: string;
  size: number;
  type: string;
};
export type PdfValidationResult =
  | { ok: true; file: ValidatedPdfFile }
  | { ok: false; error: PdfValidationError };

export function getPdfValidationMessage(error: PdfValidationError): string {
  switch (error) {
    case "not_pdf":
      return "Not a PDF. Only application/pdf files are accepted.";
    case "empty":
      return "This file is empty. Choose a PDF with content.";
    case "too_large":
      return `File too large. Maximum size is ${MAX_DOCUMENT_UPLOAD_LABEL}.`;
  }
}
