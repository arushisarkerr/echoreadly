import {
  PDF_EXTENSION,
  PDF_MAX_BYTES,
  PDF_MIME,
} from "@/features/import/utils/constants";
import { formatFileSize } from "@/features/import/utils/format-file-size";
import type { PdfValidationResult } from "@/features/import/types";

function hasPdfExtension(name: string): boolean {
  return name.trim().toLowerCase().endsWith(PDF_EXTENSION);
}

/**
 * Validate a candidate import file as a PDF within size limits.
 */
export function validatePdfFile(file: File | null | undefined): PdfValidationResult {
  if (!file) {
    return {
      ok: false,
      code: "missing",
      message: "Choose a PDF file to import.",
    };
  }

  const extensionOk = hasPdfExtension(file.name);
  const mime = file.type.trim().toLowerCase();
  const mimeOk = mime === "" || mime === PDF_MIME || mime === "application/x-pdf";

  if (!extensionOk || !mimeOk) {
    return {
      ok: false,
      code: "not_pdf",
      message: "Only PDF files are supported. Please choose a .pdf file.",
    };
  }

  if (file.size <= 0) {
    return {
      ok: false,
      code: "empty",
      message: "This PDF is empty. Choose a file with content.",
    };
  }

  if (file.size > PDF_MAX_BYTES) {
    return {
      ok: false,
      code: "too_large",
      message: `PDF is too large. Maximum size is ${formatFileSize(PDF_MAX_BYTES)}.`,
    };
  }

  return { ok: true, file };
}
