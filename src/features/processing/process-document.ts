import { PDFS_BUCKET } from "@/constants";
import { createServiceClient } from "@/lib/supabase/server";
import { recordActivityEvent } from "@/features/history/record-event";
import {
  getDocumentById,
  updateDocumentProcessing,
} from "@/features/library/server/documents";
import { chunkPlainText } from "@/features/processing/chunk-text";
import { replaceDocumentChunks } from "@/features/processing/document-chunks";
import { parseDocumentBytes } from "@/features/processing/parsers";
import { parseYoutubeWithStages } from "@/features/processing/parsers/youtube";
import type { ProcessingStage } from "@/features/processing/stages";

function toObjectKey(storagePath: string): string {
  const trimmed = storagePath.trim();
  return trimmed.startsWith(`${PDFS_BUCKET}/`)
    ? trimmed.slice(PDFS_BUCKET.length + 1)
    : trimmed;
}

async function setStage(documentId: string, stage: ProcessingStage) {
  await updateDocumentProcessing(documentId, {
    processingStatus: stage === "failed" ? "failed" : "processing",
    processingStage: stage,
    processingError: null,
  });
}

/**
 * Shared post-upload processing pipeline for every import source.
 * Status: uploaded (Queued) → processing → ready (Completed) | failed.
 * Only the extractor/parser differs by source format.
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
    processingStage: "queued",
    processingError: null,
  });

  try {
    const key = toObjectKey(document.storagePath);
    const client = createServiceClient();
    const { data, error } = await client.storage.from(PDFS_BUCKET).download(key);
    if (error || !data) {
      throw new Error(error?.message || "Unable to download document for processing.");
    }

    const bytes = new Uint8Array(await data.arrayBuffer());
    const isYoutube = document.sourceFormat === "youtube";

    const parsed = isYoutube
      ? {
          ...(await parseYoutubeWithStages(bytes, async (stage) => {
            await setStage(documentId, stage);
          })),
          formatId: "youtube" as const,
        }
      : await (async () => {
          await setStage(documentId, "extracting_content");
          const parseName =
            document.sourceFormat === "website"
              ? document.sourceUrl || document.originalFilename || document.filename
              : document.originalFilename || document.filename;
          return parseDocumentBytes(
            bytes,
            parseName,
            document.mimeType,
            document.sourceFormat,
          );
        })();

    await setStage(documentId, "chunking");
    const chunks = chunkPlainText(parsed.text);
    await replaceDocumentChunks(documentId, chunks);

    await setStage(documentId, "saving");
    const originalLanguage =
      typeof parsed.metadata?.originalLanguage === "string"
        ? parsed.metadata.originalLanguage
        : typeof parsed.metadata?.detectedLanguage === "string"
          ? parsed.metadata.detectedLanguage
          : null;

    await updateDocumentProcessing(documentId, {
      processingStatus: "ready",
      processingStage: "ready",
      processingError: null,
      pageCount: parsed.pageCount,
      extractedText: parsed.text,
      extractedAt: new Date().toISOString(),
      sourceFormat: parsed.formatId,
      sourceMetadata: parsed.metadata ?? null,
      originalLanguage,
      filename:
        parsed.title && parsed.title.trim()
          ? parsed.title.trim()
          : document.filename,
    });

    await recordActivityEvent({
      guestId: document.ownerId,
      documentId,
      eventType: "imported",
      title: `Imported ${document.sourceFormat || "document"}`,
      detail: parsed.title || document.filename,
      metadata: {
        sourceFormat: document.sourceFormat,
        textSource: parsed.metadata?.textSource ?? null,
      },
    });
  } catch (cause) {
    const message =
      cause instanceof Error && cause.message
        ? cause.message
        : "Processing failed.";
    await updateDocumentProcessing(documentId, {
      processingStatus: "failed",
      processingStage: "failed",
      processingError: message,
    });
  }
}
