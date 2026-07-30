/**
 * Server audio export — synthesize once, cache MP3, return signed download.
 */

import { randomUUID } from "crypto";

import { serverEnv } from "@/config";
import {
  getDocumentById,
  getDocumentSummaryByType,
  normalizeStoragePath,
} from "@/features/persistence";
import { ensureDocumentProcessed } from "@/features/processing";
import {
  createOpenAiTtsProvider,
  joinPageChunkText,
  MAX_TTS_INPUT_CHARS,
} from "@/features/tts";
import { resolvePreferredTtsVoiceForUser } from "@/features/tts/resolve-preferred-voice";
import {
  buildAudioExportObjectKey,
  createAudioExportSignedUrl,
  toPdfObjectKey,
  uploadAudioExportObject,
  isOwnedPdfObjectKey,
} from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

import {
  findAudioExport,
  listAudioExportsForUser,
  upsertAudioExport,
} from "./persistence";
import type {
  AudioExportDownload,
  AudioExportListItem,
  CreateAudioExportInput,
} from "./types";

export type ExportServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "INTERNAL" };

function getFileNameFromStoragePath(storagePath: string): string {
  const segments = storagePath.split("/");
  return segments[segments.length - 1] || "document.pdf";
}

function sanitizeBaseName(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^/.]+$/i, "").trim() || "document";
  return withoutExt
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "document";
}

export function buildExportDownloadFileName(input: {
  originalFileName: string | null | undefined;
  source: "page" | "summary";
  pageNumber: number | null;
  summaryType: string | null;
  voice: string;
}): string {
  const base = sanitizeBaseName(
    input.originalFileName || "document.pdf",
  );

  if (input.source === "page") {
    return `${base}-page-${input.pageNumber ?? 1}-${input.voice}.mp3`;
  }

  return `${base}-summary-${input.summaryType ?? "short"}-${input.voice}.mp3`;
}

async function resolveNarrationText(
  input: CreateAudioExportInput,
  userId: string,
): Promise<
  ExportServiceResult<{
    text: string;
    documentStoragePath: string;
    pageNumber: number | null;
    summaryType: "short" | "detailed" | "bullet" | null;
    originalFileName: string | null;
  }>
> {
  if (input.source === "summary") {
    const document = await getDocumentById(input.documentId, userId);

    if (!document.ok) {
      return { ok: false, code: "INTERNAL", error: document.error };
    }

    if (!document.data) {
      return {
        ok: false,
        code: "NOT_FOUND",
        error: "Summary is not available.",
      };
    }

    const summary = await getDocumentSummaryByType(
      input.documentId,
      userId,
      input.summaryType,
    );

    if (!summary.ok) {
      return { ok: false, code: "INTERNAL", error: summary.error };
    }

    if (!summary.data) {
      return {
        ok: false,
        code: "NOT_FOUND",
        error: "Summary is not available.",
      };
    }

    let text = summary.data.content.trim();
    if (!text) {
      return {
        ok: false,
        code: "VALIDATION",
        error: "Summary has no text to export.",
      };
    }

    if (text.length > MAX_TTS_INPUT_CHARS) {
      text = text.slice(0, MAX_TTS_INPUT_CHARS);
    }

    return {
      ok: true,
      data: {
        text,
        documentStoragePath: normalizeStoragePath(document.data.storage_path),
        pageNumber: null,
        summaryType: input.summaryType,
        originalFileName: document.data.original_file_name,
      },
    };
  }

  const objectKey = toPdfObjectKey(input.storagePath);
  if (!objectKey || !isOwnedPdfObjectKey(objectKey, userId)) {
    return {
      ok: false,
      code: "FORBIDDEN",
      error: "You do not have access to this document.",
    };
  }

  const originalFileName =
    input.originalFileName?.trim() ||
    getFileNameFromStoragePath(input.storagePath);

  const processed = await ensureDocumentProcessed({
    storagePath: input.storagePath,
    originalFileName,
  });

  if (!processed.ok) {
    return { ok: false, code: "INTERNAL", error: processed.error };
  }

  let text = joinPageChunkText(
    processed.data.chunks.chunks,
    input.pageNumber,
  );

  if (!text.trim()) {
    return {
      ok: false,
      code: "VALIDATION",
      error: "No extracted text is available for the current page.",
    };
  }

  if (text.length > MAX_TTS_INPUT_CHARS) {
    text = text.slice(0, MAX_TTS_INPUT_CHARS);
  }

  return {
    ok: true,
    data: {
      text,
      documentStoragePath: normalizeStoragePath(
        processed.data.document.storagePath || input.storagePath,
      ),
      pageNumber: input.pageNumber,
      summaryType: null,
      originalFileName:
        processed.data.document.originalFileName || originalFileName,
    },
  };
}

/**
 * Create or reuse a cached MP3 export for owned page/summary narration.
 */
export async function createOrReuseAudioExport(
  input: CreateAudioExportInput,
  userId: string,
): Promise<ExportServiceResult<AudioExportDownload>> {
  try {
    const client = await createClient();
    const voice = await resolvePreferredTtsVoiceForUser(userId, client);

    const narration = await resolveNarrationText(input, userId);
    if (!narration.ok) {
      return narration;
    }

    const {
      text,
      documentStoragePath,
      pageNumber,
      summaryType,
      originalFileName,
    } = narration.data;

    const existing = await findAudioExport(
      {
        userId,
        documentStoragePath,
        source: input.source,
        pageNumber,
        summaryType,
        voice,
      },
      client,
    );

    if (!existing.ok) {
      return { ok: false, code: "INTERNAL", error: existing.error };
    }

    const regenerate = Boolean(input.regenerate);

    if (existing.data && !regenerate) {
      const signed = await createAudioExportSignedUrl(
        existing.data.object_key,
        client,
      );

      if (signed.ok) {
        const fileName = buildExportDownloadFileName({
          originalFileName: existing.data.original_file_name,
          source: existing.data.source,
          pageNumber: existing.data.page_number,
          summaryType: existing.data.summary_type,
          voice: existing.data.voice,
        });

        return {
          ok: true,
          data: {
            exportId: existing.data.id,
            downloadUrl: signed.signedUrl,
            mimeType: existing.data.mime_type || "audio/mpeg",
            format: "mp3",
            source: existing.data.source,
            fileName,
            byteSize: existing.data.byte_size,
            voice: existing.data.voice,
            model: existing.data.model,
            cached: true,
            expiresIn: signed.expiresIn,
            pageNumber: existing.data.page_number,
            summaryType: existing.data.summary_type,
            documentStoragePath: existing.data.document_storage_path,
            originalFileName: existing.data.original_file_name,
            updatedAt: existing.data.updated_at,
          },
        };
      }
      // Cached object missing — fall through and regenerate.
    }

    const provider = createOpenAiTtsProvider(serverEnv.openAiApiKey);
    const synthesized = await provider.synthesize({ text, voice });

    if (!synthesized.ok) {
      return {
        ok: false,
        code: "INTERNAL",
        error: synthesized.error.message,
      };
    }

    const exportId = existing.data?.id ?? randomUUID();
    const objectKey =
      existing.data?.object_key ??
      buildAudioExportObjectKey(userId, exportId);

    const uploaded = await uploadAudioExportObject(
      objectKey,
      synthesized.data.audio,
      client,
      synthesized.data.mimeType,
    );

    if (!uploaded.ok) {
      return { ok: false, code: "INTERNAL", error: uploaded.error };
    }

    const saved = await upsertAudioExport(
      {
        id: exportId,
        userId,
        documentStoragePath,
        source: input.source,
        pageNumber,
        summaryType,
        voice: synthesized.data.voice,
        model: synthesized.data.model,
        objectKey,
        mimeType: synthesized.data.mimeType,
        byteSize: uploaded.byteSize,
        originalFileName,
      },
      client,
    );

    if (!saved.ok) {
      return { ok: false, code: "INTERNAL", error: saved.error };
    }

    const signed = await createAudioExportSignedUrl(objectKey, client);
    if (!signed.ok) {
      return { ok: false, code: "INTERNAL", error: signed.error };
    }

    const fileName = buildExportDownloadFileName({
      originalFileName: saved.data.original_file_name,
      source: saved.data.source,
      pageNumber: saved.data.page_number,
      summaryType: saved.data.summary_type,
      voice: saved.data.voice,
    });

    return {
      ok: true,
      data: {
        exportId: saved.data.id,
        downloadUrl: signed.signedUrl,
        mimeType: saved.data.mime_type,
        format: "mp3",
        source: saved.data.source,
        fileName,
        byteSize: saved.data.byte_size,
        voice: saved.data.voice,
        model: saved.data.model,
        cached: false,
        expiresIn: signed.expiresIn,
        pageNumber: saved.data.page_number,
        summaryType: saved.data.summary_type,
        documentStoragePath: saved.data.document_storage_path,
        originalFileName: saved.data.original_file_name,
        updatedAt: saved.data.updated_at,
      },
    };
  } catch (error) {
    return {
      ok: false,
      code: "INTERNAL",
      error:
        error instanceof Error
          ? error.message
          : "Unable to export audio.",
    };
  }
}

/**
 * List owned exports with fresh signed download URLs.
 */
export async function listOwnedAudioExports(
  userId: string,
): Promise<ExportServiceResult<AudioExportListItem[]>> {
  try {
    const client = await createClient();
    const listed = await listAudioExportsForUser(userId, client);

    if (!listed.ok) {
      return { ok: false, code: "INTERNAL", error: listed.error };
    }

    const items: AudioExportListItem[] = [];

    for (const row of listed.data) {
      const signed = await createAudioExportSignedUrl(row.object_key, client);
      if (!signed.ok) {
        continue;
      }

      items.push({
        exportId: row.id,
        downloadUrl: signed.signedUrl,
        mimeType: row.mime_type || "audio/mpeg",
        format: "mp3",
        source: row.source,
        fileName: buildExportDownloadFileName({
          originalFileName: row.original_file_name,
          source: row.source,
          pageNumber: row.page_number,
          summaryType: row.summary_type,
          voice: row.voice,
        }),
        byteSize: row.byte_size,
        voice: row.voice,
        model: row.model,
        expiresIn: signed.expiresIn,
        pageNumber: row.page_number,
        summaryType: row.summary_type,
        documentStoragePath: row.document_storage_path,
        originalFileName: row.original_file_name,
        updatedAt: row.updated_at,
      });
    }

    return { ok: true, data: items };
  } catch (error) {
    return {
      ok: false,
      code: "INTERNAL",
      error:
        error instanceof Error
          ? error.message
          : "Unable to list audio exports.",
    };
  }
}
