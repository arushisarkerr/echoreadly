import { PDFS_BUCKET } from "@/constants";
import { createServiceClient } from "@/lib/supabase/server";
import {
  extensionOf,
  labelForFormat,
  type DocumentFormatId,
} from "@/features/import/formats/registry";
import { validateDocumentFile } from "@/features/import/formats/validate-document";
import type { PdfUploadResult } from "@/features/import/types";
import {
  createDocumentRecord,
  deleteDocumentByStoragePath,
  getDocumentByHash,
  getDocumentByStoragePath,
  hashDocumentBytes,
} from "@/features/library/server/documents";
import { processUploadedDocument } from "@/features/processing/process-document";

export function duplicateLibraryMessage(formatId: DocumentFormatId): string {
  return `This ${labelForFormat(formatId)} already exists in your Library.`;
}

/** @deprecated Prefer duplicateLibraryMessage(formatId) */
export const DUPLICATE_LIBRARY_PDF_MESSAGE =
  "This PDF already exists in your Library.";

const IDEMPOTENCY_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toObjectKey(objectPath: string): string {
  return objectPath.startsWith(`${PDFS_BUCKET}/`)
    ? objectPath.slice(PDFS_BUCKET.length + 1)
    : objectPath;
}

function isStorageConflict(error: { message?: string; statusCode?: string | number }) {
  const message = (error.message ?? "").toLowerCase();
  const status = String(error.statusCode ?? "");
  return (
    status === "409" ||
    message.includes("already exists") ||
    message.includes("resource already exists") ||
    message.includes("the resource already exists") ||
    message.includes("duplicate")
  );
}

function toUploadResult(input: {
  documentId: string;
  name: string;
  size: number;
  uploadedAt: string;
  path: string;
  mimeType: string;
  ownerId: string;
  formatId: DocumentFormatId;
}): PdfUploadResult {
  return {
    uploadId: input.path,
    documentId: input.documentId,
    name: input.name,
    size: input.size,
    stagedAt: input.uploadedAt,
    path: input.path,
    storagePath: `${PDFS_BUCKET}/${input.path}`,
    mimeType: input.mimeType,
    ownerId: input.ownerId,
    formatId: input.formatId,
  };
}

/**
 * Per-attempt Storage key. Same owner + idempotency key retries the same attempt.
 */
export function createAttemptObjectKey(
  ownerId: string,
  idempotencyKey: string,
  filenameOrFormatExt: string,
): string {
  const raw = extensionOf(filenameOrFormatExt) || filenameOrFormatExt;
  const extension = raw.replace(/^\./, "") || "bin";
  return `${ownerId}/${idempotencyKey}.${extension}`;
}

async function removeStorageObject(path: string): Promise<void> {
  const key = toObjectKey(path);
  if (!key) {
    return;
  }
  const client = createServiceClient();
  try {
    await client.storage.from(PDFS_BUCKET).remove([key]);
  } catch {
    // Best-effort cleanup of a rejected duplicate attempt.
  }
}

function queueProcessing(documentId: string) {
  void processUploadedDocument(documentId).catch(() => {
    // Processing failures are persisted as status=failed inside the pipeline.
  });
}

/**
 * Shared upload pipeline for PDF / DOCX / EPUB / TXT.
 * Only validation MIME/extension and the post-upload parser differ by format.
 */
export async function uploadPdfToSupabaseBucket(
  file: File,
  ownerId: string,
  idempotencyKey: string,
  options?: { preferOcr?: boolean },
): Promise<PdfUploadResult> {
  const validation = validateDocumentFile(file, {
    preferOcr: options?.preferOcr,
  });
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const normalizedOwner = ownerId.trim();
  if (!normalizedOwner) {
    throw new Error("Missing upload owner id.");
  }

  if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
    throw new Error("Invalid upload idempotency key.");
  }

  const { formatId, mimeType } = validation;
  const duplicateMessage = duplicateLibraryMessage(formatId);
  const uploadedAt = new Date().toISOString();
  const bytes = new Uint8Array(await validation.file.arrayBuffer());
  const documentHash = hashDocumentBytes(bytes);
  const path = createAttemptObjectKey(
    normalizedOwner,
    idempotencyKey,
    validation.file.name,
  );
  const finalStoragePath = `${PDFS_BUCKET}/${path}`;

  const existingByPath = await getDocumentByStoragePath(
    normalizedOwner,
    finalStoragePath,
  );
  if (existingByPath) {
    return toUploadResult({
      documentId: existingByPath.id,
      name: existingByPath.filename,
      size: existingByPath.fileSize,
      uploadedAt: existingByPath.uploadedAt,
      path,
      mimeType: existingByPath.mimeType,
      ownerId: normalizedOwner,
      formatId,
    });
  }

  const existingByHash = await getDocumentByHash(normalizedOwner, documentHash);
  if (existingByHash) {
    throw new Error(duplicateMessage);
  }

  const client = createServiceClient();
  const { data, error } = await client.storage.from(PDFS_BUCKET).upload(path, bytes, {
    cacheControl: "3600",
    contentType: mimeType,
    upsert: false,
  });

  if (error && !isStorageConflict(error)) {
    throw new Error(error.message || "Upload failed. Please try again.");
  }

  if (error && isStorageConflict(error)) {
    const sameAttempt = await getDocumentByStoragePath(
      normalizedOwner,
      finalStoragePath,
    );
    if (sameAttempt) {
      return toUploadResult({
        documentId: sameAttempt.id,
        name: sameAttempt.filename,
        size: sameAttempt.fileSize,
        uploadedAt: sameAttempt.uploadedAt,
        path,
        mimeType: sameAttempt.mimeType,
        ownerId: normalizedOwner,
        formatId,
      });
    }

    const racedHash = await getDocumentByHash(normalizedOwner, documentHash);
    if (racedHash && racedHash.storagePath !== finalStoragePath) {
      await removeStorageObject(path);
      throw new Error(duplicateMessage);
    }

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
      sourceFormat: formatId,
    });

    if (document.storagePath !== finalStoragePath) {
      await removeStorageObject(path);
      throw new Error(duplicateMessage);
    }

    queueProcessing(document.id);

    return toUploadResult({
      documentId: document.id,
      name: document.filename,
      size: document.fileSize,
      uploadedAt: document.uploadedAt,
      path,
      mimeType: document.mimeType,
      ownerId: normalizedOwner,
      formatId,
    });
  }

  const uploadedPath = data?.path || path;
  const uploadedStoragePath = `${PDFS_BUCKET}/${uploadedPath}`;

  try {
    const racedAfterUpload = await getDocumentByHash(normalizedOwner, documentHash);
    if (racedAfterUpload && racedAfterUpload.storagePath !== uploadedStoragePath) {
      await removeStorageObject(uploadedPath);
      throw new Error(duplicateMessage);
    }

    const document = await createDocumentRecord({
      guestId: normalizedOwner,
      filename: validation.file.name,
      originalFilename: validation.file.name,
      fileSize: validation.file.size,
      mimeType,
      storagePath: uploadedStoragePath,
      uploadedAt,
      documentHash,
      processingStatus: "uploaded",
      sourceFormat: formatId,
    });

    if (document.storagePath !== uploadedStoragePath) {
      await removeStorageObject(uploadedPath);
      throw new Error(duplicateMessage);
    }

    queueProcessing(document.id);

    return toUploadResult({
      documentId: document.id,
      name: validation.file.name,
      size: validation.file.size,
      uploadedAt,
      path: uploadedPath,
      mimeType,
      ownerId: normalizedOwner,
      formatId,
    });
  } catch (cause) {
    const message =
      cause instanceof Error && cause.message
        ? cause.message
        : "Unable to create library document for this upload.";

    if (message === duplicateMessage) {
      throw cause;
    }

    if (!error) {
      await removeStorageObject(uploadedPath);
    }

    throw cause instanceof Error
      ? cause
      : new Error("Unable to create library document for this upload.");
  }
}

/**
 * Check whether an object still exists in the configured documents bucket.
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
    throw new Error(error.message || "Unable to verify uploaded document.");
  }

  const fileName = key.includes("/") ? key.slice(key.lastIndexOf("/") + 1) : key;
  return (data ?? []).some((entry) => entry.name === fileName);
}

/**
 * Remove an uploaded document from storage and its library document row.
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
    throw new Error(error.message || "Unable to remove uploaded document.");
  }

  if (ownerId) {
    try {
      await deleteDocumentByStoragePath(ownerId, storagePath);
    } catch {
      // Storage object is already removed; document cleanup is best-effort.
    }
  }
}
