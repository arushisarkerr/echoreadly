/**
 * Streaming summary generation — cache hits stay JSON; misses stream SSE.
 */

import {
  buildSummaryInput,
  buildSummaryInstructions,
  getDefaultAiProvider,
  getSummaryMaxOutputTokens,
  MAX_SUMMARY_SOURCE_CHARS,
  type SummaryResult,
  type SummaryType,
} from "@/features/ai";
import { createSseResponse } from "@/features/ai/sse";
import { streamTextWithFallback } from "@/features/ai/stream-text";
import {
  collectAllowedPages,
  parseCitedSummary,
} from "@/features/citations";
import {
  getDocumentSummaryByType,
  summaryRowToResult,
  upsertDocumentSummary,
} from "@/features/persistence";
import {
  ensureDocumentProcessed,
  getDocumentChunks,
} from "@/features/processing";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { BillingEntitlement } from "@/features/billing/types";
import { recordUsage } from "@/features/billing/gate";

function getFileNameFromStoragePath(storagePath: string): string {
  const segments = storagePath.split("/");
  return segments[segments.length - 1] || "document.pdf";
}

function sectionsToPlainText(
  summaryType: SummaryType,
  sections: SummaryResult["sections"],
): string {
  if (summaryType === "bullet") {
    return sections.map((section) => `- ${section.text}`).join("\n");
  }
  return sections.map((section) => section.text).join("\n\n");
}

export type StreamSummarizeInput = {
  userId: string;
  storagePath: string;
  summaryType: SummaryType;
  originalFileName?: string;
  fileSize?: number;
  regenerate?: boolean;
  signal: AbortSignal;
  entitlement: BillingEntitlement;
  route: string;
};

export type StreamSummarizeOutcome =
  | { mode: "json"; data: SummaryResult; cached: boolean }
  | { mode: "sse"; response: Response };

/**
 * Resolve a cached summary as JSON, or return an SSE Response for a fresh stream.
 */
export async function summarizeDocumentStreaming(
  input: StreamSummarizeInput,
): Promise<
  | { ok: true; outcome: StreamSummarizeOutcome }
  | { ok: false; error: string }
> {
  const processed = await ensureDocumentProcessed({
    storagePath: input.storagePath,
    originalFileName:
      input.originalFileName ??
      getFileNameFromStoragePath(input.storagePath),
    fileSize: input.fileSize,
  });

  if (!processed.ok) {
    return { ok: false, error: processed.error };
  }

  const documentId = processed.data.document.id;
  const client = await createClient();

  if (!input.regenerate) {
    const existing = await getDocumentSummaryByType(
      documentId,
      input.userId,
      input.summaryType,
      client,
    );
    if (existing.ok && existing.data) {
      return {
        ok: true,
        outcome: {
          mode: "json",
          data: summaryRowToResult(existing.data),
          cached: true,
        },
      };
    }
  }

  const chunks = await getDocumentChunks(documentId);
  if (!chunks.ok) {
    return { ok: false, error: chunks.error };
  }

  if (
    chunks.data.chunkCount === 0 ||
    !chunks.data.chunks.some((chunk) => chunk.text.trim().length > 0)
  ) {
    return {
      ok: false,
      error: "No extractable text is available to summarize.",
    };
  }

  const allowedPages = collectAllowedPages(
    chunks.data.chunks.map((chunk) => chunk.pageNumber),
  );
  const sourceText = chunks.data.chunks
    .map(
      (chunk) =>
        `[Page ${chunk.pageNumber}, Section ${chunk.chunkIndex + 1}]\n${chunk.text}`,
    )
    .join("\n\n");
  const truncatedSource =
    sourceText.length > MAX_SUMMARY_SOURCE_CHARS
      ? sourceText.slice(0, MAX_SUMMARY_SOURCE_CHARS).trimEnd() +
        "\n\n[Source truncated due to document length.]"
      : sourceText;

  const instructions = buildSummaryInstructions(input.summaryType);
  const promptInput = buildSummaryInput({
    summaryType: input.summaryType,
    sourceText: truncatedSource,
    documentTitle: processed.data.document.originalFileName,
  });

  const provider = getDefaultAiProvider();
  const maxOutputTokens = getSummaryMaxOutputTokens(input.summaryType);

  const response = createSseResponse({
    signal: input.signal,
    run: async (emit) => {
      emit("meta", {
        kind: "summary",
        cached: false,
        summaryType: input.summaryType,
        documentId,
      });

      let finalText = "";
      let model = "unknown";

      for await (const chunk of streamTextWithFallback(
        provider,
        {
          instructions,
          input: promptInput,
          maxOutputTokens,
          signal: input.signal,
        },
        { route: input.route },
      )) {
        if (input.signal.aborted) {
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

      if (input.signal.aborted) {
        return;
      }

      const cited = parseCitedSummary(finalText, allowedPages);
      const content = sectionsToPlainText(input.summaryType, cited.sections);
      const generatedAt = new Date().toISOString();

      const persisted = await upsertDocumentSummary(
        {
          userId: input.userId,
          documentId,
          summaryType: input.summaryType,
          content,
          citations: cited.sections,
          model,
          generatedAt,
        },
        client,
      );

      if (!persisted.ok) {
        emit("error", {
          message: persisted.error,
          code: "persist_error",
        });
        return;
      }

      const result = summaryRowToResult(persisted.data);

      try {
        await recordUsage(input.userId, "summaries", input.entitlement);
      } catch (error) {
        logger.warn(
          "Summary usage record failed",
          { route: input.route, userId: input.userId },
          error,
        );
      }

      emit("done", result);
    },
  });

  return {
    ok: true,
    outcome: { mode: "sse", response },
  };
}
