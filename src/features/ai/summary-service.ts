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

import type { AiProvider } from "./ai-provider";
import { createOpenAiProvider } from "./openai-provider";
import {
  buildSummaryInput,
  buildSummaryInstructions,
  getSummaryMaxOutputTokens,
} from "./prompts";
import {
  DEFAULT_SUMMARY_MODEL,
  MAX_SUMMARY_SOURCE_CHARS,
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

/** In-memory summary cache until database persistence ships. */
const summariesByKey = new Map<string, SummaryResult>();

let defaultProvider: AiProvider | null = null;

/**
 * Resolve the shared AI provider, lazily initialized from environment.
 */
export function getDefaultAiProvider(apiKey?: string): AiProvider {
  if (!defaultProvider) {
    defaultProvider = createOpenAiProvider(apiKey ?? serverEnv.openAiApiKey);
  }

  return defaultProvider;
}

/** Replace the default provider (useful for tests or alternate vendors). */
export function setDefaultAiProvider(provider: AiProvider): void {
  defaultProvider = provider;
}

/** Clear cached summaries and reset the default provider. */
export function resetSummaryCache(): void {
  summariesByKey.clear();
  defaultProvider = null;
}

/**
 * Generate a summary from document chunks via the configured AI provider.
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

  const generation = await provider.generateText({
    instructions: buildSummaryInstructions(input.summaryType),
    input: buildSummaryInput({
      summaryType: input.summaryType,
      documentTitle: input.documentTitle,
      sourceText,
    }),
    model: input.model ?? DEFAULT_SUMMARY_MODEL,
    maxOutputTokens: getSummaryMaxOutputTokens(input.summaryType),
  });

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
