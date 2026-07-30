/**
 * Supported import document formats (PDF + DOCX + TXT + Markdown).
 */

/** Canonical import formats. */
export type DocumentFormat = "pdf" | "docx" | "txt" | "markdown";

export const DOCUMENT_FORMATS: readonly DocumentFormat[] = [
  "pdf",
  "docx",
  "txt",
  "markdown",
] as const;

export const DOCUMENT_EXTENSIONS: Record<DocumentFormat, readonly string[]> = {
  pdf: [".pdf"],
  docx: [".docx"],
  txt: [".txt"],
  markdown: [".md", ".markdown"],
};

/** MIME types accepted for each format (server + client allowlists). */
export const DOCUMENT_MIME_TYPES: Record<DocumentFormat, readonly string[]> = {
  pdf: ["application/pdf"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/docx",
  ],
  txt: ["text/plain"],
  markdown: ["text/markdown", "text/x-markdown", "text/plain"],
};

/** `<input accept>` value for supported imports. */
export const ACCEPTED_DOCUMENT_ACCEPT = [
  ".pdf",
  ".docx",
  ".txt",
  ".md",
  ".markdown",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
].join(",");

/** Human-readable supported formats for UX copy. */
export const SUPPORTED_DOCUMENT_FORMATS_LABEL =
  "PDF, DOCX, TXT, Markdown";

/** Max characters per virtual page for plain-text / markdown / DOCX paging. */
export const VIRTUAL_PAGE_CHAR_TARGET = 2800;

const EXTENSION_TO_FORMAT = new Map<string, DocumentFormat>([
  [".pdf", "pdf"],
  [".docx", "docx"],
  [".txt", "txt"],
  [".md", "markdown"],
  [".markdown", "markdown"],
]);

export function getExtension(fileName: string): string {
  const match = fileName.toLowerCase().match(/(\.[a-z0-9]+)$/);
  return match?.[1] ?? "";
}

export function formatFromExtension(
  fileNameOrPath: string,
): DocumentFormat | null {
  const base = fileNameOrPath.split("/").pop() ?? fileNameOrPath;
  return EXTENSION_TO_FORMAT.get(getExtension(base)) ?? null;
}

export function isSupportedDocumentExtension(fileName: string): boolean {
  return formatFromExtension(fileName) !== null;
}

export function canonicalMimeForFormat(format: DocumentFormat): string {
  return DOCUMENT_MIME_TYPES[format][0]!;
}

export function mimeMatchesFormat(
  mimeType: string,
  format: DocumentFormat,
): boolean {
  const normalized = mimeType.toLowerCase().trim();
  if (!normalized) {
    return false;
  }
  return DOCUMENT_MIME_TYPES[format].some((entry) => entry === normalized);
}

/**
 * Resolve format from extension first, then MIME (never trust MIME alone).
 */
export function resolveDocumentFormat(input: {
  fileName: string;
  mimeType?: string | null;
}): DocumentFormat | null {
  const fromExt = formatFromExtension(input.fileName);
  if (!fromExt) {
    return null;
  }

  const mime = input.mimeType?.trim() ?? "";
  if (!mime) {
    return fromExt;
  }

  // Empty or octet-stream is common on some pickers — trust extension.
  if (
    mime === "application/octet-stream" ||
    mime === "binary/octet-stream"
  ) {
    return fromExt;
  }

  if (mimeMatchesFormat(mime, fromExt)) {
    return fromExt;
  }

  // Markdown often arrives as text/plain — already allowed for markdown.
  if (fromExt === "markdown" && mime === "text/plain") {
    return fromExt;
  }

  // Reject mismatched MIME/extension pairs (e.g. .pdf with text/plain).
  return null;
}

export function formatLabel(format: DocumentFormat): string {
  switch (format) {
    case "pdf":
      return "PDF";
    case "docx":
      return "DOCX";
    case "txt":
      return "TXT";
    case "markdown":
      return "Markdown";
  }
}
