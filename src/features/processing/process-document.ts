import { PDFS_BUCKET } from "@/constants";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getDocumentById,
  updateDocumentProcessing,
} from "@/features/library/server/documents";
import { parseDocumentBytes } from "@/features/processing/parsers";

function toObjectKey(storagePath: string): string {
  const trimmed = storagePath.trim();
  return trimmed.startsWith(`${PDFS_BUCKET}/`)
    ? trimmed.slice(PDFS_BUCKET.length + 1)
    : trimmed;
}

/**
 * Shared post-upload processing pipeline.
 * Status: uploaded (Queued) → processing → ready (Completed) | failed.
 * Only the parser/extractor differs by format.
 */
export async function processUploadedDocument(documentId: string): Promise<void> {
  const document = await getDocumentById(documentId);
  if (!document) {
    return;
  }

  if (document.processingStatus === "ready") {
    return;
  }

  await updateDocumentProcessing(documentId, {
    processingStatus: "processing",
  });

  try {
    const key = toObjectKey(document.storagePath);
    const client = createServiceClient();
    const { data, error } = await client.storage.from(PDFS_BUCKET).download(key);
    if (error || !data) {
      throw new Error(error?.message || "Unable to download document for processing.");
    }

    const bytes = new Uint8Array(await data.arrayBuffer());
    const parsed = await parseDocumentBytes(
      bytes,
      document.originalFilename || document.filename,
      document.mimeType,
    );

    await updateDocumentProcessing(documentId, {
      processingStatus: "ready",
      pageCount: parsed.pageCount,
      extractedText: parsed.text,
      extractedAt: new Date().toISOString(),
      sourceFormat: parsed.formatId,
      filename:
        parsed.title && parsed.title.trim()
          ? parsed.title.trim()
          : document.filename,
    });
  } catch {
    await updateDocumentProcessing(documentId, {
      processingStatus: "failed",
    });
  }
}
