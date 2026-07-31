import { validateDocumentFile } from "@/features/import/formats/validate-document";
import type { PdfValidationResult } from "@/features/import/types";

/**
 * Backward-compatible validator — delegates to the shared multi-format validator.
 */
export function validatePdfFile(file: File | null | undefined): PdfValidationResult {
  const result = validateDocumentFile(file);
  if (!result.ok) {
    return {
      ok: false,
      code:
        result.code === "unsupported_type" ? "not_pdf" : result.code,
      message: result.message,
    };
  }

  return { ok: true, file: result.file };
}
