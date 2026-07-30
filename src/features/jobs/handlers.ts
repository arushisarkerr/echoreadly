/**
 * Background job handlers — wrap existing feature services.
 */

import { createHash } from "crypto";

import { serverEnv } from "@/config";
import { isSupportedTargetLanguage } from "@/constants";
import type { SummaryType } from "@/features/ai";
import { getAnalyticsOverview } from "@/features/analytics/overview";
import { invalidateEntitlementCache } from "@/features/billing/entitlements";
import { createOrReuseAudioExport } from "@/features/export/export-service";
import type { CreateAudioExportInput } from "@/features/export/types";
import { createMistralOcrProvider } from "@/features/ocr";
import {
  ensureDocumentProcessed,
  summarizeDocument,
} from "@/features/processing";
import { listChunksByDocumentId } from "@/features/persistence";
import { translateDocumentContent } from "@/features/translation/translate-service";
import type { TranslateRequestInput } from "@/features/translation/types";
import {
  createOpenAiTtsProvider,
  joinPageChunkText,
  MAX_TTS_INPUT_CHARS,
} from "@/features/tts";
import { downloadPdfBytes } from "@/lib/storage";
import { logger } from "@/lib/logger";
import type { JobType } from "@/constants/jobs";

import { runCleanupJobsRpc } from "./persistence";
import type { JobHandler, JobHandlerContext } from "./types";
import { buildWorkerOwnership } from "./worker-ownership";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function fileNameFromPath(storagePath: string): string {
  const segments = storagePath.split("/");
  return segments[segments.length - 1] || "document.pdf";
}

function assertNotAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new Error("Job cancelled or timed out.");
  }
}

const handleDocumentProcess: JobHandler = async (ctx) => {
  const ownership = buildWorkerOwnership(ctx.job.user_id);
  const storagePath =
    asString(ctx.job.storage_path) ||
    asString(ctx.job.payload.storagePath);
  if (!storagePath) {
    throw new Error("storagePath is required for document_process.");
  }

  await ctx.updateProgress(10, "downloading");
  assertNotAborted(ctx.signal);

  const originalFileName =
    asString(ctx.job.payload.originalFileName) ||
    fileNameFromPath(storagePath);
  const fileSize = asNumber(ctx.job.payload.fileSize) ?? undefined;

  await ctx.updateProgress(25, "extracting");
  const processed = await ensureDocumentProcessed({
    storagePath,
    originalFileName,
    fileSize,
    ownership,
  });

  assertNotAborted(ctx.signal);
  if (!processed.ok) {
    throw new Error(processed.error);
  }

  await ctx.updateProgress(90, "persisting");
  return {
    step: "ready",
    result: {
      documentId: processed.data.document.id,
      pageCount: processed.data.document.pageCount,
      chunkCount: processed.data.chunks.chunkCount,
      reused: processed.data.reused,
    },
  };
};

const handleOcr: JobHandler = async (ctx) => {
  const storagePath =
    asString(ctx.job.storage_path) ||
    asString(ctx.job.payload.storagePath);
  if (!storagePath) {
    throw new Error("storagePath is required for OCR.");
  }

  const mistralKey = serverEnv.mistralApiKey;
  if (!mistralKey) {
    throw new Error(
      "OCR is not configured. Set MISTRAL_API_KEY to enable scanned PDF OCR.",
    );
  }

  await ctx.updateProgress(15, "downloading");
  const ownership = buildWorkerOwnership(ctx.job.user_id);
  const download = await downloadPdfBytes(storagePath, ownership.client, {
    userId: ctx.job.user_id,
  });
  if (!download.data) {
    throw new Error(download.error || "Unable to download PDF for OCR.");
  }

  await ctx.updateProgress(40, "ocr_running");
  assertNotAborted(ctx.signal);

  const provider = createMistralOcrProvider({ apiKey: mistralKey });
  let extracted;
  try {
    extracted = await provider.extractPdf(Buffer.from(download.data));
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "OCR extraction failed.",
    );
  }

  await ctx.updateProgress(85, "ocr_complete");
  return {
    step: "ocr_complete",
    result: {
      pageCount: extracted.pageTexts.length,
      characterCount: extracted.fullText.length,
      confidence: extracted.confidence ?? null,
      provider: "mistral",
    },
  };
};

const handleSummary: JobHandler = async (ctx) => {
  const ownership = buildWorkerOwnership(ctx.job.user_id);
  const storagePath =
    asString(ctx.job.storage_path) ||
    asString(ctx.job.payload.storagePath);
  if (!storagePath) {
    throw new Error("storagePath is required for summary_generate.");
  }

  const summaryType = (asString(ctx.job.payload.summaryType) ||
    "short") as SummaryType;
  const originalFileName =
    asString(ctx.job.payload.originalFileName) ||
    fileNameFromPath(storagePath);

  await ctx.updateProgress(15, "processing_document");
  const processed = await ensureDocumentProcessed({
    storagePath,
    originalFileName,
    fileSize: asNumber(ctx.job.payload.fileSize) ?? undefined,
    ownership,
  });
  if (!processed.ok) {
    throw new Error(processed.error);
  }

  assertNotAborted(ctx.signal);
  await ctx.updateProgress(45, "generating_summary");

  const summary = await summarizeDocument(
    processed.data.document.id,
    summaryType,
    {
      regenerate: asBoolean(ctx.job.payload.regenerate),
      ownership,
    },
  );
  if (!summary.ok) {
    throw new Error(summary.error);
  }

  return {
    step: "summary_ready",
    result: {
      documentId: processed.data.document.id,
      summaryType,
      generatedAt: summary.data.generatedAt,
      model: summary.data.model,
    },
  };
};

const handleTranslation: JobHandler = async (ctx) => {
  const targetLanguage = asString(ctx.job.payload.targetLanguage);
  if (!targetLanguage || !isSupportedTargetLanguage(targetLanguage)) {
    throw new Error("A valid targetLanguage is required for translation.");
  }

  const scope = asString(ctx.job.payload.scope) || "document";
  let input: TranslateRequestInput;

  if (scope === "summary") {
    const documentId =
      asString(ctx.job.document_id) ||
      asString(ctx.job.payload.documentId);
    const summaryType = asString(ctx.job.payload.summaryType) || "short";
    if (!documentId) {
      throw new Error("documentId is required for summary translation.");
    }
    input = {
      scope: "summary",
      documentId,
      summaryType: summaryType as SummaryType,
      targetLanguage,
      regenerate: asBoolean(ctx.job.payload.regenerate),
    };
  } else if (scope === "page") {
    const storagePath =
      asString(ctx.job.storage_path) ||
      asString(ctx.job.payload.storagePath);
    const pageNumber = asNumber(ctx.job.payload.pageNumber);
    if (!storagePath || pageNumber == null) {
      throw new Error("storagePath and pageNumber are required.");
    }
    input = {
      scope: "page",
      storagePath,
      originalFileName:
        asString(ctx.job.payload.originalFileName) || undefined,
      pageNumber,
      targetLanguage,
      regenerate: asBoolean(ctx.job.payload.regenerate),
    };
  } else if (scope === "selection") {
    const storagePath =
      asString(ctx.job.storage_path) ||
      asString(ctx.job.payload.storagePath);
    const text = asString(ctx.job.payload.text);
    if (!storagePath || !text) {
      throw new Error("storagePath and text are required for selection.");
    }
    input = {
      scope: "selection",
      storagePath,
      text,
      targetLanguage,
      regenerate: asBoolean(ctx.job.payload.regenerate),
    };
  } else {
    const storagePath =
      asString(ctx.job.storage_path) ||
      asString(ctx.job.payload.storagePath);
    if (!storagePath) {
      throw new Error("storagePath is required for document translation.");
    }
    input = {
      scope: "document",
      storagePath,
      originalFileName:
        asString(ctx.job.payload.originalFileName) || undefined,
      targetLanguage,
      regenerate: asBoolean(ctx.job.payload.regenerate),
    };
  }

  await ctx.updateProgress(20, "translating");
  assertNotAborted(ctx.signal);

  const translated = await translateDocumentContent(input, ctx.job.user_id, {
    ownership: buildWorkerOwnership(ctx.job.user_id),
  });
  if (!translated.ok) {
    throw new Error(translated.error);
  }

  return {
    step: "translation_ready",
    result: {
      translationId: translated.data.translationId,
      documentId: translated.data.documentId,
      cached: translated.data.cached,
      targetLanguage: translated.data.targetLanguage,
    },
  };
};

const handleTts: JobHandler = async (ctx) => {
  const ownership = buildWorkerOwnership(ctx.job.user_id);
  let text = asString(ctx.job.payload.text);

  if (!text) {
    const storagePath =
      asString(ctx.job.storage_path) ||
      asString(ctx.job.payload.storagePath);
    const pageNumber = asNumber(ctx.job.payload.pageNumber) ?? 1;
    if (!storagePath) {
      throw new Error("text or storagePath is required for TTS.");
    }

    await ctx.updateProgress(15, "loading_page");
    const processed = await ensureDocumentProcessed({
      storagePath,
      originalFileName:
        asString(ctx.job.payload.originalFileName) ||
        fileNameFromPath(storagePath),
      ownership,
    });
    if (!processed.ok) {
      throw new Error(processed.error);
    }

    const chunkRows = await listChunksByDocumentId(
      processed.data.document.id,
      ctx.job.user_id,
      ownership.client,
    );
    if (!chunkRows.ok) {
      throw new Error(chunkRows.error);
    }

    text = joinPageChunkText(
      chunkRows.data.map((row) => ({
        pageNumber: row.page_number,
        text: row.text,
      })),
      pageNumber,
    ).slice(0, MAX_TTS_INPUT_CHARS);
  }

  if (!text.trim()) {
    throw new Error("No text available for TTS.");
  }

  await ctx.updateProgress(40, "synthesizing");
  assertNotAborted(ctx.signal);

  const voice =
    asString(ctx.job.payload.voice) ||
    "alloy";
  const provider = createOpenAiTtsProvider(serverEnv.openAiApiKey);
  const synthesized = await provider.synthesize({ text, voice });
  if (!synthesized.ok) {
    throw new Error(synthesized.error.message);
  }

  return {
    step: "tts_ready",
    result: {
      voice: synthesized.data.voice,
      model: synthesized.data.model,
      characterCount: synthesized.data.characterCount,
      mimeType: synthesized.data.mimeType,
      byteSize: synthesized.data.audio.byteLength,
    },
  };
};

const handleAudioExport: JobHandler = async (ctx) => {
  const source = asString(ctx.job.payload.source) || "page";
  let input: CreateAudioExportInput;

  if (source === "summary") {
    const documentId =
      asString(ctx.job.document_id) ||
      asString(ctx.job.payload.documentId);
    const summaryType = asString(ctx.job.payload.summaryType) || "short";
    if (!documentId) {
      throw new Error("documentId is required for summary export.");
    }
    input = {
      source: "summary",
      documentId,
      summaryType: summaryType as SummaryType,
      regenerate: asBoolean(ctx.job.payload.regenerate),
      targetLanguage: asString(ctx.job.payload.targetLanguage) as never,
    };
  } else {
    const storagePath =
      asString(ctx.job.storage_path) ||
      asString(ctx.job.payload.storagePath);
    const pageNumber = asNumber(ctx.job.payload.pageNumber);
    if (!storagePath || pageNumber == null) {
      throw new Error("storagePath and pageNumber are required for page export.");
    }
    input = {
      source: "page",
      storagePath,
      pageNumber,
      originalFileName:
        asString(ctx.job.payload.originalFileName) || undefined,
      regenerate: asBoolean(ctx.job.payload.regenerate),
      targetLanguage: asString(ctx.job.payload.targetLanguage) as never,
    };
  }

  await ctx.updateProgress(25, "exporting_audio");
  assertNotAborted(ctx.signal);

  const exported = await createOrReuseAudioExport(input, ctx.job.user_id, {
    ownership: buildWorkerOwnership(ctx.job.user_id),
  });
  if (!exported.ok) {
    throw new Error(exported.error);
  }

  return {
    step: "export_ready",
    result: {
      exportId: exported.data.exportId,
      cached: exported.data.cached,
      byteSize: exported.data.byteSize,
      voice: exported.data.voice,
      documentStoragePath: exported.data.documentStoragePath,
    },
  };
};

const handleEmbedding: JobHandler = async (ctx) => {
  const ownership = buildWorkerOwnership(ctx.job.user_id);
  const documentId =
    asString(ctx.job.document_id) || asString(ctx.job.payload.documentId);
  const storagePath =
    asString(ctx.job.storage_path) ||
    asString(ctx.job.payload.storagePath);

  let resolvedDocumentId = documentId;

  if (!resolvedDocumentId && storagePath) {
    await ctx.updateProgress(10, "processing_document");
    const processed = await ensureDocumentProcessed({
      storagePath,
      originalFileName:
        asString(ctx.job.payload.originalFileName) ||
        fileNameFromPath(storagePath),
      ownership,
    });
    if (!processed.ok) {
      throw new Error(processed.error);
    }
    resolvedDocumentId = processed.data.document.id;
  }

  if (!resolvedDocumentId) {
    throw new Error("documentId or storagePath is required for embeddings.");
  }

  await ctx.updateProgress(40, "loading_chunks");
  const chunks = await listChunksByDocumentId(
    resolvedDocumentId,
    ctx.job.user_id,
    ownership.client,
  );
  if (!chunks.ok) {
    throw new Error(chunks.error);
  }

  await ctx.updateProgress(70, "hashing_chunks");
  assertNotAborted(ctx.signal);

  // Deterministic placeholder embeddings until a vector store ships.
  const embeddings = chunks.data.slice(0, 200).map((chunk) => {
    const digest = createHash("sha256")
      .update(chunk.text)
      .digest("hex")
      .slice(0, 32);
    return {
      chunkId: chunk.id,
      pageNumber: chunk.page_number,
      chunkIndex: chunk.chunk_index,
      digest,
      dimensions: 8,
      vector: Array.from({ length: 8 }, (_, index) => {
        const byte = Number.parseInt(digest.slice(index * 2, index * 2 + 2), 16);
        return Number.isFinite(byte) ? byte / 255 : 0;
      }),
    };
  });

  return {
    step: "embeddings_ready",
    result: {
      documentId: resolvedDocumentId,
      chunkCount: chunks.data.length,
      embeddingCount: embeddings.length,
      mode: "deterministic_stub",
      embeddings: embeddings.slice(0, 20),
    },
  };
};

const handleAnalyticsAggregate: JobHandler = async (ctx) => {
  await ctx.updateProgress(20, "aggregating");
  const overview = await getAnalyticsOverview({
    userId: ctx.job.user_id,
    preset: "30d",
  });
  assertNotAborted(ctx.signal);
  await ctx.updateProgress(80, "caching_snapshot");

  return {
    step: "analytics_ready",
    result: {
      range: overview.range,
      totalDocuments: overview.kpis.totalDocuments,
      totalReadingMinutes: overview.kpis.totalReadingMinutes,
      totalAiRequests: overview.kpis.totalAiRequests,
      readingStreakDays: overview.kpis.readingStreakDays,
      seriesDays: overview.series.length,
      generatedAt: new Date().toISOString(),
    },
  };
};

const handleCacheRefresh: JobHandler = async (ctx) => {
  await ctx.updateProgress(30, "invalidating_entitlement_cache");
  invalidateEntitlementCache(ctx.job.user_id);
  await ctx.updateProgress(70, "refreshing_analytics_snapshot");
  const overview = await getAnalyticsOverview({
    userId: ctx.job.user_id,
    preset: "7d",
  });
  return {
    step: "cache_refreshed",
    result: {
      entitlementInvalidated: true,
      analyticsKpis: {
        totalDocuments: overview.kpis.totalDocuments,
        aiRequestsInRange: overview.kpis.aiRequestsInRange,
      },
    },
  };
};

const handleCleanup: JobHandler = async (ctx) => {
  await ctx.updateProgress(20, "cleaning_jobs");
  const deleted = await runCleanupJobsRpc({
    olderThanDays: asNumber(ctx.job.payload.olderThanDays) ?? 14,
    limit: asNumber(ctx.job.payload.limit) ?? 500,
  });
  return {
    step: "cleanup_done",
    result: { deletedJobs: deleted },
  };
};

export const JOB_HANDLERS: Record<JobType, JobHandler> = {
  document_process: handleDocumentProcess,
  ocr: handleOcr,
  summary_generate: handleSummary,
  translation: handleTranslation,
  tts_generate: handleTts,
  audio_export: handleAudioExport,
  embedding_generate: handleEmbedding,
  analytics_aggregate: handleAnalyticsAggregate,
  cache_refresh: handleCacheRefresh,
  cleanup: handleCleanup,
};

export async function runJobHandler(ctx: JobHandlerContext): Promise<void> {
  const type = ctx.job.job_type as JobType;
  const handler = JOB_HANDLERS[type];
  if (!handler) {
    throw new Error(`Unsupported job type: ${ctx.job.job_type}`);
  }

  try {
    await handler(ctx);
  } catch (error) {
    logger.warn(
      "Job handler failed",
      {
        jobId: ctx.job.id,
        jobType: ctx.job.job_type,
        userId: ctx.job.user_id,
      },
      error,
    );
    throw error;
  }
}
