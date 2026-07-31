import { PDFS_BUCKET } from "@/constants";
import { createServiceClient } from "@/lib/supabase/server";
import {
  mimeTypeForFormat,
  type DocumentFormatId,
} from "@/features/import/formats/registry";
import { validateSafeHttpUrl, fetchSafeUrl } from "@/features/import/safe-fetch-url";
import type { PdfUploadResult } from "@/features/import/types";
import {
  createDocumentRecord,
  getDocumentByHash,
  getDocumentByStoragePath,
  hashDocumentBytes,
} from "@/features/library/server/documents";
import { processUploadedDocument } from "@/features/processing/process-document";
import {
  extractYoutubeVideoId,
  isYoutubeUrl,
} from "@/features/processing/parsers/youtube";

const IDEMPOTENCY_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function queueProcessing(documentId: string) {
  void processUploadedDocument(documentId).catch(() => {
    // Persisted as failed inside the shared pipeline.
  });
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
  alreadyExists?: boolean;
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
    alreadyExists: input.alreadyExists,
  };
}

async function removeStorageObject(path: string): Promise<void> {
  const client = createServiceClient();
  try {
    await client.storage.from(PDFS_BUCKET).remove([path]);
  } catch {
    // best-effort
  }
}

/**
 * Shared link ingest for Website + YouTube — same Storage/DB/processing spine as files.
 */
export async function ingestLinkToLibrary(
  rawUrl: string,
  ownerId: string,
  idempotencyKey: string,
): Promise<PdfUploadResult> {
  const normalizedOwner = ownerId.trim();
  if (!normalizedOwner) {
    throw new Error("Missing upload owner id.");
  }
  if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
    throw new Error("Invalid upload idempotency key.");
  }

  const safe = validateSafeHttpUrl(rawUrl);
  if (!safe.ok) {
    throw new Error(safe.message);
  }

  const youtube = isYoutubeUrl(safe.url.toString());
  const formatId: DocumentFormatId = youtube ? "youtube" : "website";

  let identityKey: string;
  let filename: string;
  let mimeType: string;
  let bytes: Uint8Array;
  let sourceUrl: string;

  if (youtube) {
    const videoId = extractYoutubeVideoId(safe.url.toString());
    if (!videoId) {
      throw new Error("Enter a valid YouTube URL.");
    }
    identityKey = `youtube:${videoId}`;
    sourceUrl = `https://www.youtube.com/watch?v=${videoId}`;
    filename = `${videoId}.json`;
    mimeType = mimeTypeForFormat("youtube");
    bytes = new TextEncoder().encode(
      JSON.stringify({ url: sourceUrl, videoId }),
    );
  } else {
    const fetched = await fetchSafeUrl(safe.url);
    sourceUrl = fetched.finalUrl;
    // Canonical-ish identity for duplicate detection.
    try {
      const canonical = new URL(sourceUrl);
      canonical.hash = "";
      identityKey = `website:${canonical.toString()}`;
    } catch {
      identityKey = `website:${sourceUrl}`;
    }
    filename = "article.html";
    mimeType = mimeTypeForFormat("website");
    bytes = new TextEncoder().encode(fetched.body);
  }

  const documentHash = hashDocumentBytes(identityKey);
  const path = `${normalizedOwner}/${idempotencyKey}.${youtube ? "json" : "html"}`;
  const finalStoragePath = `${PDFS_BUCKET}/${path}`;
  const uploadedAt = new Date().toISOString();

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
    // YouTube (and website) duplicates open the existing Library document.
    return toUploadResult({
      documentId: existingByHash.id,
      name: existingByHash.filename,
      size: existingByHash.fileSize,
      uploadedAt: existingByHash.uploadedAt,
      path: existingByHash.storagePath.replace(/^pdfs\//, ""),
      mimeType: existingByHash.mimeType,
      ownerId: normalizedOwner,
      formatId,
      alreadyExists: true,
    });
  }

  const client = createServiceClient();
  const { error } = await client.storage.from(PDFS_BUCKET).upload(path, bytes, {
    cacheControl: "3600",
    contentType: mimeType,
    upsert: false,
  });

  if (error) {
    const message = (error.message ?? "").toLowerCase();
    if (message.includes("already exists") || message.includes("duplicate")) {
      const raced = await getDocumentByHash(normalizedOwner, documentHash);
      if (raced) {
        return toUploadResult({
          documentId: raced.id,
          name: raced.filename,
          size: raced.fileSize,
          uploadedAt: raced.uploadedAt,
          path: raced.storagePath.replace(/^pdfs\//, ""),
          mimeType: raced.mimeType,
          ownerId: normalizedOwner,
          formatId,
          alreadyExists: true,
        });
      }
    }
    throw new Error(error.message || "Upload failed. Please try again.");
  }

  try {
    const raced = await getDocumentByHash(normalizedOwner, documentHash);
    if (raced && raced.storagePath !== finalStoragePath) {
      await removeStorageObject(path);
      return toUploadResult({
        documentId: raced.id,
        name: raced.filename,
        size: raced.fileSize,
        uploadedAt: raced.uploadedAt,
        path: raced.storagePath.replace(/^pdfs\//, ""),
        mimeType: raced.mimeType,
        ownerId: normalizedOwner,
        formatId,
        alreadyExists: true,
      });
    }

    const document = await createDocumentRecord({
      guestId: normalizedOwner,
      filename,
      originalFilename: filename,
      fileSize: bytes.byteLength,
      mimeType,
      storagePath: finalStoragePath,
      uploadedAt,
      documentHash,
      processingStatus: "uploaded",
      sourceFormat: formatId,
      sourceUrl,
      sourceMetadata: youtube
        ? { videoId: extractYoutubeVideoId(sourceUrl) }
        : { url: sourceUrl },
    });

    if (document.storagePath !== finalStoragePath) {
      await removeStorageObject(path);
      return toUploadResult({
        documentId: document.id,
        name: document.filename,
        size: document.fileSize,
        uploadedAt: document.uploadedAt,
        path: document.storagePath.replace(/^pdfs\//, ""),
        mimeType: document.mimeType,
        ownerId: normalizedOwner,
        formatId,
        alreadyExists: true,
      });
    }

    queueProcessing(document.id);

    return toUploadResult({
      documentId: document.id,
      name: document.filename,
      size: document.fileSize,
      uploadedAt: document.uploadedAt,
      path,
      mimeType,
      ownerId: normalizedOwner,
      formatId,
    });
  } catch (cause) {
    await removeStorageObject(path);
    throw cause instanceof Error
      ? cause
      : new Error("Unable to create library document.");
  }
}
