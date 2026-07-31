import { PDFS_BUCKET } from "@/constants";
import { createServiceClient } from "@/lib/supabase/server";
import type { PdfUploadResult } from "@/features/import/types";
import {
  createDocumentRecord,
  deleteDocumentByStoragePath,
  hashDocumentBytes,
} from "@/features/library/server/documents";
import { validatePdfFile } from "@/features/import/utils/validate-pdf";

function toObjectKey(objectPath: string): string {
  return objectPath.startsWith(`${PDFS_BUCKET}/`)
    ? objectPath.slice(PDFS_BUCKET.length + 1)
    : objectPath;
}

function createObjectKey(ownerId: string, originalFileName: string): string {
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
  return `${ownerId}/${fileId}.pdf`;
}

/**
 * Upload a validated PDF into the existing private `pdfs` bucket, then create
 * the matching library document row. Storage is rolled back if the DB write fails.
 */
export async function uploadPdfToSupabaseBucket(
  file: File,
  ownerId: string,
): Promise<PdfUploadResult> {
  const validation = validatePdfFile(file);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const normalizedOwner = ownerId.trim();
  if (!normalizedOwner) {
    throw new Error("Missing upload owner id.");
  }

  const path = createObjectKey(normalizedOwner, validation.file.name);
  const mimeType = validation.file.type || "application/pdf";
  const uploadedAt = new Date().toISOString();
  const bytes = new Uint8Array(await validation.file.arrayBuffer());
  const contentHash = hashDocumentBytes(bytes);

  const client = createServiceClient();
  const { data, error } = await client.storage.from(PDFS_BUCKET).upload(path, bytes, {
    cacheControl: "3600",
    contentType: mimeType,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message || "Upload failed. Please try again.");
  }

  const uploadedPath = data.path || path;
  const finalStoragePath = `${PDFS_BUCKET}/${uploadedPath}`;
  // Per-object hash so the same PDF can be uploaded more than once under unique paths.
  const documentHash = hashDocumentBytes(
    new TextEncoder().encode(`${finalStoragePath}:${contentHash}`),
  );

  try {
    const document = await createDocumentRecord({
      guestId: normalizedOwner,
      filename: validation.file.name,
      originalFilename: validation.file.name,
      fileSize: validation.file.size,
      mimeType,
      storagePath: finalStoragePath,
      uploadedAt,
      documentHash,
      processingStatus: "uploaded",
    });

    return {
      uploadId: uploadedPath,
      documentId: document.id,
      name: validation.file.name,
      size: validation.file.size,
      stagedAt: uploadedAt,
      path: uploadedPath,
      storagePath: finalStoragePath,
      mimeType,
      ownerId: normalizedOwner,
    };
  } catch (cause) {
    try {
      await client.storage.from(PDFS_BUCKET).remove([uploadedPath]);
    } catch {
      // Best-effort rollback of the orphaned storage object.
    }

    throw cause instanceof Error
      ? cause
      : new Error("Unable to create library document for this upload.");
  }
}

/**
 * Check whether an object still exists in the configured `pdfs` bucket.
 */
export async function pdfExistsInSupabaseBucket(objectPath: string): Promise<boolean> {
  const key = toObjectKey(objectPath).trim();
  if (!key) {
    return false;
  }

  const client = createServiceClient();
  const { data, error } = await client.storage.from(PDFS_BUCKET).list(
    key.includes("/") ? key.slice(0, key.lastIndexOf("/")) : "",
    {
      search: key.includes("/") ? key.slice(key.lastIndexOf("/") + 1) : key,
      limit: 20,
    },
  );

  if (error) {
    throw new Error(error.message || "Unable to verify uploaded PDF.");
  }

  const fileName = key.includes("/") ? key.slice(key.lastIndexOf("/") + 1) : key;
  return (data ?? []).some((entry) => entry.name === fileName);
}

/**
 * Remove an uploaded PDF from storage and its library document row.
 */
export async function deletePdfFromSupabaseBucket(
  objectPath: string,
  ownerId?: string,
): Promise<void> {
  const key = toObjectKey(objectPath);
  const storagePath = objectPath.startsWith(`${PDFS_BUCKET}/`)
    ? objectPath
    : `${PDFS_BUCKET}/${objectPath}`;

  if (!key) {
    return;
  }

  const client = createServiceClient();
  const { error } = await client.storage.from(PDFS_BUCKET).remove([key]);
  if (error) {
    throw new Error(error.message || "Unable to remove uploaded PDF.");
  }

  if (ownerId) {
    try {
      await deleteDocumentByStoragePath(ownerId, storagePath);
    } catch {
      // Storage object is already removed; document cleanup is best-effort.
    }
  }
}
