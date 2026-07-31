import {
  DOCUMENT_FORMATS,
  DOCUMENT_MAX_BYTES,
  detectDocumentFormat,
  labelForFormat,
  type DocumentFormatId,
} from "@/features/import/formats/registry";
import { formatFileSize } from "@/features/import/utils/format-file-size";

export type DocumentValidationErrorCode =
  | "missing"
  | "unsupported_type"
  | "empty"
  | "too_large";

export type DocumentValidationResult =
  | {
      ok: true;
      file: File;
      formatId: DocumentFormatId;
      mimeType: string;
    }
  | {
      ok: false;
      code: DocumentValidationErrorCode;
      message: string;
    };

function mimeAllowedForFormat(
  formatId: DocumentFormatId,
  mime: string,
): boolean {
  if (!mime) {
    return true;
  }
  const format = DOCUMENT_FORMATS[formatId];
  return (
    format.mimeTypes.includes(mime) ||
    Boolean(format.mimeAliases?.includes(mime))
  );
}

/**
 * Validate an import file against the shared enabled-format registry.
 */
export function validateDocumentFile(
  file: File | null | undefined,
): DocumentValidationResult {
  if (!file) {
    return {
      ok: false,
      code: "missing",
      message: "Choose a file to import.",
    };
  }

  const formatId = detectDocumentFormat(file.name, file.type);
  if (!formatId) {
    return {
      ok: false,
      code: "unsupported_type",
      message:
        "Only PDF, DOCX, EPUB, and TXT files are supported.",
    };
  }

  const mime = file.type.trim().toLowerCase();
  if (!mimeAllowedForFormat(formatId, mime)) {
    return {
      ok: false,
      code: "unsupported_type",
      message: `Only ${labelForFormat(formatId)} files are supported for this type.`,
    };
  }

  if (file.size <= 0) {
    return {
      ok: false,
      code: "empty",
      message: "This file is empty. Choose a file with content.",
    };
  }

  if (file.size > DOCUMENT_MAX_BYTES) {
    return {
      ok: false,
      code: "too_large",
      message: `File is too large. Maximum size is ${formatFileSize(DOCUMENT_MAX_BYTES)}.`,
    };
  }

  return {
    ok: true,
    file,
    formatId,
    mimeType: mime || DOCUMENT_FORMATS[formatId].mimeTypes[0],
  };
}
