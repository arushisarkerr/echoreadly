/**
 * Upload a validated PDF to the private `pdfs` Supabase Storage bucket.
 * Objects are stored at `{userId}/{fileId}.pdf`. Returns paths only —
 * never fabricates a public URL for a private bucket.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { ACCEPTED_PDF_MIME, PDFS_BUCKET } from "@/constants";
import { createClient } from "@/lib/supabase/client";
import { validatePdfFile } from "@/lib/validators";

export type PdfUploadStatus = "success" | "error";

export type PdfUploadErrorCode =
  | "upload_failed"
  | "network_error"
  | "storage_unavailable"
  | "validation_failed";

export type PdfUploadError = {
  code: PdfUploadErrorCode;
  message: string;
};

export type PdfUploadResult = {
  status: PdfUploadStatus;
  /** Object key within the bucket (`{userId}/{fileId}.pdf`). */
  path: string | null;
  /** Bucket-qualified storage path (`pdfs/{userId}/{fileId}.pdf`). Not a public URL. */
  storagePath: string | null;
  error: PdfUploadError | null;
};

export type PdfUploadProgress = {
  /**
   * Upload completion from 0–100 when the transport reports it.
   * `null` means progress is indeterminate (current Supabase upload API).
   */
  percent: number | null;
};

export type UploadPdfOptions = {
  /** Defaults to the browser Supabase client. */
  client?: SupabaseClient;
  /** Reserved for future byte-level progress; currently receives `percent: null`. */
  onProgress?: (progress: PdfUploadProgress) => void;
};

/**
 * Build a unique object key: `{userId}/{fileId}.pdf`.
 */
export function createPdfObjectKey(
  userId: string,
  originalFileName: string,
): string {
  const uniqueId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const baseName = originalFileName.replace(/\.[^/.]+$/, "").trim();
  const safeBase = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  const fileId = safeBase.length > 0 ? `${safeBase}-${uniqueId}` : uniqueId;
  return `${userId}/${fileId}.pdf`;
}

function toStoragePath(objectKey: string): string {
  return `${PDFS_BUCKET}/${objectKey}`;
}

function classifyStorageError(error: unknown): PdfUploadError {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof (error as { message: unknown }).message === "string"
        ? (error as { message: string }).message
        : "Upload failed.";

  const normalized = message.toLowerCase();

  if (
    error instanceof TypeError ||
    normalized.includes("failed to fetch") ||
    normalized.includes("network") ||
    normalized.includes("offline")
  ) {
    return {
      code: "network_error",
      message: "Network error. Check your connection and try again.",
    };
  }

  if (
    normalized.includes("bucket") ||
    normalized.includes("not found") ||
    (normalized.includes("storage") && normalized.includes("unavailable")) ||
    normalized.includes("404")
  ) {
    return {
      code: "storage_unavailable",
      message: "Storage is unavailable. Confirm the pdfs bucket exists.",
    };
  }

  return {
    code: "upload_failed",
    message: message || "Upload failed. Please try again.",
  };
}

/**
 * Upload a PDF file to Supabase Storage under the signed-in user's folder.
 * Re-validates the file, then writes to the private `pdfs` bucket.
 */
export async function uploadPdf(
  file: File,
  options: UploadPdfOptions = {},
): Promise<PdfUploadResult> {
  const validation = validatePdfFile(file);

  if (!validation.ok) {
    return {
      status: "error",
      path: null,
      storagePath: null,
      error: {
        code: "validation_failed",
        message:
          validation.error === "too_large"
            ? "File too large for upload."
            : validation.error === "empty"
              ? "Empty files cannot be uploaded."
              : "Only application/pdf files can be uploaded.",
      },
    };
  }

  const client = options.client ?? createClient();

  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) {
    return {
      status: "error",
      path: null,
      storagePath: null,
      error: {
        code: "upload_failed",
        message: "You must be signed in to upload.",
      },
    };
  }

  const path = createPdfObjectKey(user.id, file.name);

  options.onProgress?.({ percent: null });

  try {
    const { data, error } = await client.storage.from(PDFS_BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType: ACCEPTED_PDF_MIME,
      upsert: false,
    });

    if (error) {
      return {
        status: "error",
        path: null,
        storagePath: null,
        error: classifyStorageError(error),
      };
    }

    const uploadedPath = data.path || path;

    options.onProgress?.({ percent: 100 });

    return {
      status: "success",
      path: uploadedPath,
      storagePath: toStoragePath(uploadedPath),
      error: null,
    };
  } catch (error) {
    return {
      status: "error",
      path: null,
      storagePath: null,
      error: classifyStorageError(error),
    };
  }
}
