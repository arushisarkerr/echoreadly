/**
 * Supported import formats — files, links, and OCR share one registry.
 */

export type DocumentFormatId =
  | "pdf"
  | "docx"
  | "epub"
  | "txt"
  | "website"
  | "youtube"
  | "ocr";

export type DocumentFormatDefinition = {
  id: DocumentFormatId;
  label: string;
  extension: string;
  mimeTypes: readonly string[];
  mimeAliases?: readonly string[];
};

/** Shared size limit for binary uploads. */
export const DOCUMENT_MAX_BYTES = 100 * 1024 * 1024;

export const DOCUMENT_FORMATS: Record<DocumentFormatId, DocumentFormatDefinition> = {
  pdf: {
    id: "pdf",
    label: "PDF",
    extension: ".pdf",
    mimeTypes: ["application/pdf"],
    mimeAliases: ["application/x-pdf"],
  },
  docx: {
    id: "docx",
    label: "DOCX",
    extension: ".docx",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
  epub: {
    id: "epub",
    label: "EPUB",
    extension: ".epub",
    mimeTypes: ["application/epub+zip"],
    mimeAliases: ["application/x-epub+zip"],
  },
  txt: {
    id: "txt",
    label: "TXT",
    extension: ".txt",
    mimeTypes: ["text/plain"],
  },
  website: {
    id: "website",
    label: "Website",
    extension: ".html",
    mimeTypes: ["text/html"],
  },
  youtube: {
    id: "youtube",
    label: "YouTube",
    extension: ".json",
    mimeTypes: ["application/json"],
  },
  ocr: {
    id: "ocr",
    label: "OCR",
    extension: ".png",
    mimeTypes: ["image/png", "image/jpeg", "image/webp", "application/pdf"],
    mimeAliases: ["image/jpg", "image/heic", "image/heif"],
  },
};

/** File-tab formats (not OCR-only / not link-only). */
export const FILE_DOCUMENT_FORMAT_IDS: DocumentFormatId[] = [
  "pdf",
  "docx",
  "epub",
  "txt",
];

export const ENABLED_DOCUMENT_FORMAT_IDS: DocumentFormatId[] = [
  "pdf",
  "docx",
  "epub",
  "txt",
  "website",
  "youtube",
  "ocr",
];

export const OCR_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".heic",
  ".heif",
  ".pdf",
] as const;

export const DOCUMENT_ACCEPT = FILE_DOCUMENT_FORMAT_IDS.map((id) => {
  const format = DOCUMENT_FORMATS[id];
  return [...format.mimeTypes, format.extension].join(",");
}).join(",");

export const OCR_ACCEPT = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".heic",
  ".pdf",
].join(",");

export function getFormatById(id: DocumentFormatId): DocumentFormatDefinition {
  return DOCUMENT_FORMATS[id];
}

export function extensionOf(filename: string): string {
  const name = filename.trim().toLowerCase();
  const index = name.lastIndexOf(".");
  if (index < 0) {
    return "";
  }
  return name.slice(index);
}

export function detectDocumentFormat(
  filename: string,
  mimeType?: string,
  options?: { preferOcr?: boolean },
): DocumentFormatId | null {
  const extension = extensionOf(filename);
  const mime = (mimeType ?? "").trim().toLowerCase();

  if (options?.preferOcr) {
    if (
      OCR_EXTENSIONS.includes(extension as (typeof OCR_EXTENSIONS)[number]) ||
      mime.startsWith("image/") ||
      mime === "application/pdf"
    ) {
      return "ocr";
    }
  }

  for (const id of FILE_DOCUMENT_FORMAT_IDS) {
    const format = DOCUMENT_FORMATS[id];
    if (extension === format.extension) {
      return id;
    }
  }

  for (const id of FILE_DOCUMENT_FORMAT_IDS) {
    const format = DOCUMENT_FORMATS[id];
    if (format.mimeTypes.includes(mime) || format.mimeAliases?.includes(mime)) {
      return id;
    }
  }

  // Standalone OCR image uploads outside the OCR tab.
  if (
    OCR_EXTENSIONS.includes(extension as (typeof OCR_EXTENSIONS)[number]) ||
    mime.startsWith("image/")
  ) {
    return "ocr";
  }

  return null;
}

export function mimeTypeForFormat(id: DocumentFormatId): string {
  return DOCUMENT_FORMATS[id].mimeTypes[0];
}

export function labelForFormat(id: DocumentFormatId): string {
  return DOCUMENT_FORMATS[id].label;
}

export function labelForMimeType(mimeType: string, sourceFormat?: string | null): string {
  if (sourceFormat && sourceFormat in DOCUMENT_FORMATS) {
    return DOCUMENT_FORMATS[sourceFormat as DocumentFormatId].label;
  }
  const mime = mimeType.trim().toLowerCase();
  for (const id of ENABLED_DOCUMENT_FORMAT_IDS) {
    const format = DOCUMENT_FORMATS[id];
    if (format.mimeTypes.includes(mime) || format.mimeAliases?.includes(mime)) {
      return format.label;
    }
  }
  return "Document";
}

export function labelForSourceFormat(sourceFormat: string | null | undefined): string {
  if (!sourceFormat) {
    return "Document";
  }
  if (sourceFormat in DOCUMENT_FORMATS) {
    return DOCUMENT_FORMATS[sourceFormat as DocumentFormatId].label;
  }
  return sourceFormat;
}
