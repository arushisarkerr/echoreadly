/**
 * Document import upload types — shared across PDF / DOCX / EPUB / TXT.
 */

import type { DocumentFormatId } from "@/features/import/formats/registry";

export type PdfUploadStatus = "idle" | "uploading" | "success" | "failed";

export type SelectedPdf = {
  file: File;
  name: string;
  size: number;
  type: string;
  formatId?: DocumentFormatId;
};

export type PdfUploadResult = {
  uploadId: string;
  /** Library document id created after a successful storage upload. */
  documentId: string;
  name: string;
  size: number;
  stagedAt: string;
  /** Object key within the documents bucket. */
  path: string;
  /** Bucket-qualified storage path. */
  storagePath: string;
  mimeType: string;
  ownerId: string;
  formatId?: DocumentFormatId;
};

export type PdfValidationErrorCode =
  | "missing"
  | "not_pdf"
  | "unsupported_type"
  | "empty"
  | "too_large";

export type PdfValidationResult =
  | { ok: true; file: File }
  | { ok: false; code: PdfValidationErrorCode; message: string };

export type PdfUploadProgressEvent = {
  loaded: number;
  total: number;
  percent: number;
};

/** Serializable selected-file metadata for persistence across navigations. */
export type SelectedPdfMeta = {
  name: string;
  size: number;
  type: string;
  formatId?: DocumentFormatId;
};
