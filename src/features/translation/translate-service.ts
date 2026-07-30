/**
 * Server translation service — AI translate + cache by content hash.
 */

import { createHash, randomUUID } from "crypto";

import {
  MAX_TRANSLATION_SOURCE_CHARS,
  type TargetLanguageCode,
} from "@/constants";
import {
  getDefaultAiProvider,
  getSharedGeminiFallbackProvider,
  shouldFallbackToGemini,
  type SummaryType,
} from "@/features/ai";
import { createSseResponse } from "@/features/ai/sse";
import { streamTextWithFallback } from "@/features/ai/stream-text";
import { recordUsage } from "@/features/billing/gate";
import type { BillingEntitlement } from "@/features/billing/types";
import { trackAnalyticsEventAsync } from "@/features/analytics/track-event";
import type { OwnershipContext } from "@/features/auth/ownership";
import {
  getDocumentById,
  getDocumentSummaryByType,
} from "@/features/persistence";
import { ensureDocumentProcessed } from "@/features/processing";
import { joinPageChunkText } from "@/features/tts";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

import {
  findDocumentTranslation,
  upsertDocumentTranslation,
} from "./persistence";
import {
  buildTranslationInput,
  buildTranslationInstructions,
  getTranslationMaxOutputTokens,
} from "./prompts";
import type {
  TranslateRequestInput,
  TranslationResult,
} from "./types";

export type TranslateServiceResult<T = TranslationResult> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      code?: "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "INTERNAL";
    };

function getFileNameFromStoragePath(storagePath: string): string {
  const segments = storagePath.split("/");
  return segments[segments.length - 1] || "document.pdf";
}

function hashText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function truncateSource(text: string): string {
  if (text.length <= MAX_TRANSLATION_SOURCE_CHARS) {
    return text;
  }
  return (
    text.slice(0, MAX_TRANSLATION_SOURCE_CHARS).trimEnd() +
    "\n\n[Source truncated due to length.]"
  );
}

function formatChunksForTranslation(
  chunks: Array<{ pageNumber: number; chunkIndex: number; text: string }>,
): string {
  return chunks
    .map(
      (chunk) =>
        `[Page ${chunk.pageNumber}, Section ${chunk.chunkIndex + 1}]\n${chunk.text}`,
    )
    .join("\n\n");
}

async function resolveSource(
  input: TranslateRequestInput,
  userId: string,
  ownership?: OwnershipContext,
): Promise<
  TranslateServiceResult<{
    documentId: string;
    sourceText: string;
    pageNumber: number | null;
    summaryType: SummaryType | null;
    selectionHash: string | null;
    documentTitle: string | null;
  }>
> {
  if (input.scope === "summary") {
    const document = await getDocumentById(
      input.documentId,
      userId,
      ownership?.client,
    );
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
      ownership?.client,
    );
    if (!summary.ok) {
      return { ok: false, code: "INTERNAL", error: summary.error };
    }
    if (!summary.data?.content.trim()) {
      return {
        ok: false,
        code: "NOT_FOUND",
        error: "Generate a summary before translating it.",
      };
    }

    return {
      ok: true,
      data: {
        documentId: input.documentId,
        sourceText: summary.data.content.trim(),
        pageNumber: null,
        summaryType: input.summaryType,
        selectionHash: null,
        documentTitle: document.data.original_file_name,
      },
    };
  }

  const processed = await ensureDocumentProcessed({
    storagePath: input.storagePath,
    originalFileName:
      input.originalFileName ??
      getFileNameFromStoragePath(input.storagePath),
    ownership,
  });

  if (!processed.ok) {
    return { ok: false, code: "INTERNAL", error: processed.error };
  }

  const documentId = processed.data.document.id;
  const documentTitle = processed.data.document.originalFileName;

  if (input.scope === "document") {
    const sourceText = truncateSource(
      formatChunksForTranslation(processed.data.chunks.chunks),
    );
    if (!sourceText.trim()) {
      return {
        ok: false,
        code: "VALIDATION",
        error: "No extractable text is available for this document.",
      };
    }
    return {
      ok: true,
      data: {
        documentId,
        sourceText,
        pageNumber: null,
        summaryType: null,
        selectionHash: null,
        documentTitle,
      },
    };
  }

  if (input.scope === "page") {
    const sourceText = joinPageChunkText(
      processed.data.chunks.chunks,
      input.pageNumber,
    ).trim();
    if (!sourceText) {
      return {
        ok: false,
        code: "VALIDATION",
        error: "No extractable text is available for this page.",
      };
    }
    return {
      ok: true,
      data: {
        documentId,
        sourceText: truncateSource(sourceText),
        pageNumber: input.pageNumber,
        summaryType: null,
        selectionHash: null,
        documentTitle,
      },
    };
  }

  const selection = input.text.trim();
  return {
    ok: true,
    data: {
      documentId,
      sourceText: truncateSource(selection),
      pageNumber: null,
      summaryType: null,
      selectionHash: hashText(selection),
      documentTitle,
    },
  };
}

/**
 * Translate owned document content, reusing cache when the source hash matches.
 */
export async function translateDocumentContent(
  input: TranslateRequestInput,
  userId: string,
  options?: { ownership?: OwnershipContext },
): Promise<TranslateServiceResult> {
  try {
    const resolved = await resolveSource(input, userId, options?.ownership);
    if (!resolved.ok) {
      return resolved;
    }

    const {
      documentId,
      sourceText,
      pageNumber,
      summaryType,
      selectionHash,
      documentTitle,
    } = resolved.data;

    const sourceContentHash = hashText(sourceText);
    const client = options?.ownership?.client ?? (await createClient());

    const existing = await findDocumentTranslation(
      {
        userId,
        documentId,
        scope: input.scope,
        pageNumber,
        summaryType,
        selectionHash,
        targetLanguage: input.targetLanguage,
        sourceContentHash,
      },
      client,
    );

    if (!existing.ok) {
      return { ok: false, code: "INTERNAL", error: existing.error };
    }

    if (existing.data && !input.regenerate) {
      return {
        ok: true,
        data: {
          translationId: existing.data.id,
          documentId,
          scope: existing.data.scope,
          pageNumber: existing.data.page_number,
          summaryType: existing.data.summary_type,
          targetLanguage: existing.data.target_language as TargetLanguageCode,
          sourceText: existing.data.source_text,
          translatedText: existing.data.translated_text,
          sourceContentHash: existing.data.source_content_hash,
          model: existing.data.model,
          cached: true,
          generatedAt: existing.data.generated_at,
        },
      };
    }

    const provider = getDefaultAiProvider();
    const instructions = buildTranslationInstructions(input.targetLanguage);
    const prompt = buildTranslationInput({
      scope: input.scope,
      targetLanguage: input.targetLanguage,
      sourceText,
      documentTitle: documentTitle ?? undefined,
      pageNumber,
    });

    let generation = await provider.generateText({
      instructions,
      input: prompt,
      maxOutputTokens: getTranslationMaxOutputTokens(sourceText.length),
      responseFormat: "text",
    });

    if (!generation.ok && shouldFallbackToGemini(generation.error)) {
      const fallback = getSharedGeminiFallbackProvider();
      if (fallback.isConfigured()) {
        generation = await fallback.generateText({
          instructions,
          input: prompt,
          maxOutputTokens: getTranslationMaxOutputTokens(sourceText.length),
          responseFormat: "text",
        });
      }
    }

    if (!generation.ok) {
      return {
        ok: false,
        code: "INTERNAL",
        error: generation.error.message,
      };
    }

    const translatedText = generation.data.text.trim();
    if (!translatedText) {
      return {
        ok: false,
        code: "INTERNAL",
        error: "Translation returned empty text.",
      };
    }

    const saved = await upsertDocumentTranslation(
      {
        id: existing.data?.id ?? randomUUID(),
        userId,
        documentId,
        scope: input.scope,
        pageNumber,
        summaryType,
        selectionHash,
        targetLanguage: input.targetLanguage,
        sourceContentHash,
        sourceText,
        translatedText,
        model: generation.data.model,
      },
      client,
    );

    if (!saved.ok) {
      return { ok: false, code: "INTERNAL", error: saved.error };
    }

    return {
      ok: true,
      data: {
        translationId: saved.data.id,
        documentId,
        scope: saved.data.scope,
        pageNumber: saved.data.page_number,
        summaryType: saved.data.summary_type,
        targetLanguage: saved.data.target_language as TargetLanguageCode,
        sourceText: saved.data.source_text,
        translatedText: saved.data.translated_text,
        sourceContentHash: saved.data.source_content_hash,
        model: saved.data.model,
        cached: false,
        generatedAt: saved.data.generated_at,
      },
    };
  } catch (error) {
    return {
      ok: false,
      code: "INTERNAL",
      error:
        error instanceof Error
          ? error.message
          : "Unable to translate document.",
    };
  }
}

/** Hash helper for selection identity. */
export { hashText as hashTranslationSourceText };

export type StreamTranslateInput = {
  input: TranslateRequestInput;
  userId: string;
  signal: AbortSignal;
  entitlement: BillingEntitlement;
  route: string;
};

export type StreamTranslateOutcome =
  | { mode: "json"; data: TranslationResult }
  | { mode: "sse"; response: Response };

/**
 * Cache hits return JSON. Fresh translations stream plain-text deltas over SSE.
 */
export async function translateDocumentContentStreaming(
  args: StreamTranslateInput,
): Promise<TranslateServiceResult<StreamTranslateOutcome>> {
  try {
    const resolved = await resolveSource(args.input, args.userId);
    if (!resolved.ok) {
      return resolved;
    }

    const {
      documentId,
      sourceText,
      pageNumber,
      summaryType,
      selectionHash,
      documentTitle,
    } = resolved.data;

    const sourceContentHash = hashText(sourceText);
    const client = await createClient();

    const existing = await findDocumentTranslation(
      {
        userId: args.userId,
        documentId,
        scope: args.input.scope,
        pageNumber,
        summaryType,
        selectionHash,
        targetLanguage: args.input.targetLanguage,
        sourceContentHash,
      },
      client,
    );

    if (!existing.ok) {
      return { ok: false, code: "INTERNAL", error: existing.error };
    }

    if (existing.data && !args.input.regenerate) {
      return {
        ok: true,
        data: {
          mode: "json",
          data: {
            translationId: existing.data.id,
            documentId,
            scope: existing.data.scope,
            pageNumber: existing.data.page_number,
            summaryType: existing.data.summary_type,
            targetLanguage: existing.data
              .target_language as TargetLanguageCode,
            sourceText: existing.data.source_text,
            translatedText: existing.data.translated_text,
            sourceContentHash: existing.data.source_content_hash,
            model: existing.data.model,
            cached: true,
            generatedAt: existing.data.generated_at,
          },
        },
      };
    }

    const provider = getDefaultAiProvider();
    const instructions = buildTranslationInstructions(
      args.input.targetLanguage,
    );
    const prompt = buildTranslationInput({
      scope: args.input.scope,
      targetLanguage: args.input.targetLanguage,
      sourceText,
      documentTitle: documentTitle ?? undefined,
      pageNumber,
    });

    const response = createSseResponse({
      signal: args.signal,
      run: async (emit) => {
        emit("meta", {
          kind: "translation",
          cached: false,
          scope: args.input.scope,
          targetLanguage: args.input.targetLanguage,
        });

        let finalText = "";
        let model = "unknown";

        for await (const chunk of streamTextWithFallback(
          provider,
          {
            instructions,
            input: prompt,
            maxOutputTokens: getTranslationMaxOutputTokens(sourceText.length),
            signal: args.signal,
            responseFormat: "text",
          },
          { route: args.route },
        )) {
          if (args.signal.aborted) {
            return;
          }
          if (chunk.type === "delta") {
            emit("delta", { text: chunk.text });
            continue;
          }
          if (chunk.type === "error") {
            emit("error", {
              message: chunk.error.message,
              code: chunk.error.code,
            });
            return;
          }
          if (chunk.type === "done") {
            finalText = chunk.text;
            model = chunk.model;
          }
        }

        if (args.signal.aborted) {
          return;
        }

        const translatedText = finalText.trim();
        if (!translatedText) {
          emit("error", {
            message: "Translation returned empty text.",
            code: "empty",
          });
          return;
        }

        const saved = await upsertDocumentTranslation(
          {
            id: existing.data?.id ?? randomUUID(),
            userId: args.userId,
            documentId,
            scope: args.input.scope,
            pageNumber,
            summaryType,
            selectionHash,
            targetLanguage: args.input.targetLanguage,
            sourceContentHash,
            sourceText,
            translatedText,
            model,
          },
          client,
        );

        if (!saved.ok) {
          emit("error", { message: saved.error, code: "persist_error" });
          return;
        }

        try {
          await recordUsage(args.userId, "translation", args.entitlement);
        } catch (error) {
          logger.warn(
            "Translation usage record failed",
            { route: args.route, userId: args.userId },
            error,
          );
        }

        trackAnalyticsEventAsync({
          userId: args.userId,
          eventName: "translation_created",
          documentId,
          metadata: {
            scope: args.input.scope,
            mode: "stream",
            targetLanguage: args.input.targetLanguage,
          },
        });
        trackAnalyticsEventAsync({
          userId: args.userId,
          eventName: "streaming_ai",
          activity: false,
          documentId,
          metadata: { feature: "translation" },
        });

        emit("done", {
          translationId: saved.data.id,
          documentId,
          scope: saved.data.scope,
          pageNumber: saved.data.page_number,
          summaryType: saved.data.summary_type,
          targetLanguage: saved.data.target_language as TargetLanguageCode,
          sourceText: saved.data.source_text,
          translatedText: saved.data.translated_text,
          sourceContentHash: saved.data.source_content_hash,
          model: saved.data.model,
          cached: false,
          generatedAt: saved.data.generated_at,
        } satisfies TranslationResult);
      },
    });

    return { ok: true, data: { mode: "sse", response } };
  } catch (error) {
    return {
      ok: false,
      code: "INTERNAL",
      error:
        error instanceof Error
          ? error.message
          : "Unable to translate document.",
    };
  }
}

