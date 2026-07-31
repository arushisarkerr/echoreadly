/**
 * Supported upload document formats — shared registry for validation,
 * Storage keys, Library mime labels, and parser dispatch.
 */

export type DocumentFormatId = "pdf" | "docx" | "epub" | "txt";

export type DocumentFormatDefinition = {
  id: DocumentFormatId;
  label: string;
  extension: string;
  mimeTypes: readonly string[];
  /** Extra MIME aliases browsers may report. */
  mimeAliases?: readonly string[];
};

/** Shared size limit for all import formats (same as PDF milestone). */
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
};

export const ENABLED_DOCUMENT_FORMAT_IDS: DocumentFormatId[] = [
  "pdf",
  "docx",
  "epub",
  "txt",
];

/**
 * `<input accept>` value covering every enabled format.
 */
export const DOCUMENT_ACCEPT = ENABLED_DOCUMENT_FORMAT_IDS.map((id) => {
  const format = DOCUMENT_FORMATS[id];
  return [...format.mimeTypes, format.extension].join(",");
}).join(",");

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

/**
 * Resolve a format from filename + optional MIME. Extension wins when MIME is empty/generic.
 */
export function detectDocumentFormat(
  filename: string,
  mimeType?: string,
): DocumentFormatId | null {
  const extension = extensionOf(filename);
  const mime = (mimeType ?? "").trim().toLowerCase();

  for (const id of ENABLED_DOCUMENT_FORMAT_IDS) {
    const format = DOCUMENT_FORMATS[id];
    if (extension === format.extension) {
      return id;
    }
  }

  for (const id of ENABLED_DOCUMENT_FORMAT_IDS) {
    const format = DOCUMENT_FORMATS[id];
    if (format.mimeTypes.includes(mime) || format.mimeAliases?.includes(mime)) {
      return id;
    }
  }

  return null;
}

export function mimeTypeForFormat(id: DocumentFormatId): string {
  return DOCUMENT_FORMATS[id].mimeTypes[0];
}

export function labelForFormat(id: DocumentFormatId): string {
  return DOCUMENT_FORMATS[id].label;
}

export function labelForMimeType(mimeType: string): string {
  const mime = mimeType.trim().toLowerCase();
  for (const id of ENABLED_DOCUMENT_FORMAT_IDS) {
    const format = DOCUMENT_FORMATS[id];
    if (format.mimeTypes.includes(mime) || format.mimeAliases?.includes(mime)) {
      return format.label;
    }
  }
  return "Document";
}
