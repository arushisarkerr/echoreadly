/**
 * PDF import upload types — milestone 1.
 */

export type PdfUploadStatus = "idle" | "uploading" | "success" | "failed";

export type SelectedPdf = {
  file: File;
  name: string;
  size: number;
  type: string;
};

export type PdfUploadResult = {
  uploadId: string;
  /** Library document id created after a successful storage upload. */
  documentId: string;
  name: string;
  size: number;
  stagedAt: string;
  /** Object key within the `pdfs` bucket (`{ownerId}/{fileId}.pdf`). */
  path: string;
  /** Bucket-qualified storage path (`pdfs/{ownerId}/{fileId}.pdf`). */
  storagePath: string;
  mimeType: string;
  ownerId: string;
};

export type PdfValidationErrorCode =
  | "missing"
  | "not_pdf"
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
};
