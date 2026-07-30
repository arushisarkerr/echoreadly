/**
 * Document summary generation from processed chunks.
 * Uses the AI provider abstraction — no direct SDK coupling.
 */

import type { DocumentChunkResult } from "@/features/processing/document-chunks";
import {
  collectAllowedPages,
  formatPageCitations,
  parseCitedSummary,
} from "@/features/citations";

import { serverEnv } from "@/config";
import { logger } from "@/lib/logger";

import type { AiProvider } from "./ai-provider";
import { createGeminiProvider } from "./gemini-provider";
import { createOpenAiProvider } from "./openai-provider";
import {
  buildSummaryInput,
  buildSummaryInstructions,
  getSummaryMaxOutputTokens,
} from "./prompts";
import {
  DEFAULT_SUMMARY_MODEL,
  MAX_SUMMARY_SOURCE_CHARS,
  type AiError,
  type SummaryResult,
  type SummaryServiceResult,
  type SummaryType,
} from "./types";

export type GenerateSummaryInput = {
  documentId: string;
  chunks: DocumentChunkResult;
  summaryType: SummaryType;
  documentTitle?: string;
  model?: string;
  provider?: AiProvider;
};

function formatChunksForPrompt(chunks: DocumentChunkResult["chunks"]): string {
  return chunks
    .map(
      (chunk) =>
        `[Page ${chunk.pageNumber}, Section ${chunk.chunkIndex + 1}]\n${chunk.text}`,
    )
    .join("\n\n");
}

function truncateSourceText(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  return (
    text.slice(0, maxChars).trimEnd() +
    "\n\n[Source truncated due to document length.]"
  );
}

function hasChunkContent(chunks: DocumentChunkResult): boolean {
  return (
    chunks.chunkCount > 0 &&
    chunks.chunks.some((chunk) => chunk.text.trim().length > 0)
  );
}

function summaryCacheKey(documentId: string, summaryType: SummaryType): string {
  return `${documentId}:${summaryType}`;
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

/**
 * OpenAI failures that should trigger an automatic Gemini retry.
 */
function shouldFallbackToGemini(error: AiError): boolean {
  if (error.code === "rate_limit") {
    return true;
  }

  const normalized = error.message.toLowerCase();
  return (
    normalized.includes("429") ||
    normalized.includes("rate limit") ||
    normalized.includes("quota") ||
    normalized.includes("temporarily unavailable") ||
    normalized.includes("service unavailable")
  );
}

/** Compact error label for server logs (no message body / PII). */
function summarizeErrorType(error: AiError): string {
  const normalized = error.message.toLowerCase();

  if (normalized.includes("quota")) {
    return "quota";
  }

  if (
    error.code === "rate_limit" ||
    normalized.includes("429") ||
    normalized.includes("rate limit")
  ) {
    return "rate_limit";
  }

  if (
    normalized.includes("temporarily unavailable") ||
    normalized.includes("service unavailable")
  ) {
    return "temporarily_unavailable";
  }

  return error.code;
}

/** In-memory summary cache until database persistence ships. */
const summariesByKey = new Map<string, SummaryResult>();

let defaultProvider: AiProvider | null = null;
let geminiFallbackProvider: AiProvider | null = null;

/**
 * Resolve the shared AI provider, lazily initialized from environment.
 * OpenAI remains the primary summarization provider.
 */
export function getDefaultAiProvider(apiKey?: string): AiProvider {
  if (!defaultProvider) {
    defaultProvider = createOpenAiProvider(apiKey ?? serverEnv.openAiApiKey);
  }

  return defaultProvider;
}

function getGeminiFallbackProvider(): AiProvider {
  if (!geminiFallbackProvider) {
    const geminiApiKeyPresent = Boolean(serverEnv.geminiApiKey);
    geminiFallbackProvider = createGeminiProvider(serverEnv.geminiApiKey);
    // TEMPORARY diagnostics — key presence only; never log the key value.
    logger.warn("Gemini fallback provider created", {
      geminiApiKeyPresent,
      geminiProviderConfigured: geminiFallbackProvider.isConfigured(),
    });
  }

  return geminiFallbackProvider;
}

/** Replace the default provider (useful for tests or alternate vendors). */
export function setDefaultAiProvider(provider: AiProvider): void {
  defaultProvider = provider;
}

/** Clear cached summaries and reset the default provider. */
export function resetSummaryCache(): void {
  summariesByKey.clear();
  defaultProvider = null;
  geminiFallbackProvider = null;
}

/**
 * Generate a summary from document chunks via the configured AI provider.
 * On OpenAI rate-limit / quota / temporary unavailability, retries once with Gemini.
 */
export async function generateDocumentSummary(
  input: GenerateSummaryInput,
): Promise<SummaryServiceResult> {
  if (!input.documentId.trim()) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        message: "documentId is required.",
      },
    };
  }

  if (!hasChunkContent(input.chunks)) {
    return {
      ok: false,
      error: {
        code: "empty_document",
        message: "Cannot summarize an empty document.",
      },
    };
  }

  const provider = input.provider ?? getDefaultAiProvider();
  const sourceText = truncateSourceText(
    formatChunksForPrompt(input.chunks.chunks),
    MAX_SUMMARY_SOURCE_CHARS,
  );

  const instructions = buildSummaryInstructions(input.summaryType);
  const promptInput = buildSummaryInput({
    summaryType: input.summaryType,
    documentTitle: input.documentTitle,
    sourceText,
  });
  const maxOutputTokens = getSummaryMaxOutputTokens(input.summaryType);

  let generation = await provider.generateText({
    instructions,
    input: promptInput,
    model: input.model ?? DEFAULT_SUMMARY_MODEL,
    maxOutputTokens,
  });

  if (
    !generation.ok &&
    shouldFallbackToGemini(generation.error) &&
    provider.name !== "gemini"
  ) {
    const fallback = getGeminiFallbackProvider();
    if (fallback.isConfigured()) {
      logger.warn("Summarization falling back to Gemini", {
        primaryProvider: provider.name,
        fallbackProvider: "gemini",
        errorType: summarizeErrorType(generation.error),
      });

      generation = await fallback.generateText({
        instructions,
        input: promptInput,
        // Use Gemini's own default model — never reuse the OpenAI model id.
        maxOutputTokens,
      });

      if (generation.ok) {
        logger.info("Summarization Gemini fallback succeeded", {
          provider: "gemini",
          reason: "fallback_from_openai",
        });
      } else {
        logger.error("Summarization Gemini fallback failed", {
          provider: "gemini",
          originalProvider: "openai",
          errorType: summarizeErrorType(generation.error),
        });
      }
    }
  }

  if (!generation.ok) {
    return generation;
  }

  const allowedPages = collectAllowedPages(
    input.chunks.chunks.map((chunk) => chunk.pageNumber),
  );
  const cited = parseCitedSummary(generation.data.text, allowedPages);
  const content = sectionsToPlainText(input.summaryType, cited.sections);

  const result: SummaryResult = {
    documentId: input.documentId,
    summaryType: input.summaryType,
    content,
    sections: cited.sections,
    generatedAt: new Date().toISOString(),
    model: generation.data.model,
  };

  summariesByKey.set(
    summaryCacheKey(input.documentId, input.summaryType),
    result,
  );

  return { ok: true, data: result };
}

/**
 * Build a copy-friendly string that includes citation labels.
 */
export function formatSummaryForCopy(summary: SummaryResult): string {
  if (summary.sections.length === 0) {
    return summary.content;
  }

  return summary.sections
    .map((section) => {
      const body =
        summary.summaryType === "bullet" ? `- ${section.text}` : section.text;
      const citation = formatPageCitations(section.pages);
      return citation ? `${body}\n${citation}` : body;
    })
    .join(summary.summaryType === "bullet" ? "\n" : "\n\n");
}

/**
 * Read a previously generated summary from the in-memory cache.
 */
export function getDocumentSummary(
  documentId: string,
  summaryType: SummaryType,
): SummaryServiceResult {
  const cached = summariesByKey.get(summaryCacheKey(documentId, summaryType));

  if (!cached) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        message: `No ${summaryType} summary found for this document.`,
      },
    };
  }

  return { ok: true, data: cached };
}
