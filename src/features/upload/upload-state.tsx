/**
 * Upload UI state model.
 * Validation helpers live in `@/lib/validators`.
 * Storage upload lives in `@/lib/storage`.
 */

import type { PdfUploadError } from "@/lib/storage";
import type { PdfValidationError, ValidatedPdfFile } from "@/lib/validators";

export type UploadStatus =
  | "idle"
  | "dragging"
  | "selected"
  | "invalid"
  | "uploading"
  | "success"
  | "failed";

export type UploadValidationError = PdfValidationError;

export type SelectedUploadFile = ValidatedPdfFile;

export type UploadUiState = {
  status: UploadStatus;
  /** Metadata shown in the UI. */
  file: SelectedUploadFile | null;
  /** Actual File retained for the storage upload call. */
  sourceFile: File | null;
  validationError: UploadValidationError | null;
  uploadError: PdfUploadError | null;
  /** 0–100 when known; null while indeterminate. */
  progressPercent: number | null;
  /** Private storage object key after a successful upload. */
  uploadedPath: string | null;
  /** Bucket-qualified path (`pdfs/...`) — not a public URL. */
  uploadedStoragePath: string | null;
};

export const INITIAL_UPLOAD_STATE: UploadUiState = {
  status: "idle",
  file: null,
  sourceFile: null,
  validationError: null,
  uploadError: null,
  progressPercent: null,
  uploadedPath: null,
  uploadedStoragePath: null,
};
