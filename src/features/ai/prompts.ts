/**
 * Prompt templates for document summarization.
 */

import { SUMMARY_CITATION_FORMAT } from "@/features/citations";

import type { SummaryType } from "./types";

const BASE_INSTRUCTIONS =
  "You are EchoReadly, an expert reading assistant. Summarize PDF document excerpts accurately. " +
  "Use only the provided source text. Do not invent facts, citations, or content that is not present. " +
  "Write in clear, plain English.";

const SUMMARY_TYPE_GUIDANCE: Record<SummaryType, string> = {
  short:
    "Produce a short summary of 2–3 sentences that captures the document's main purpose and key takeaway. " +
    "Put each sentence in its own sections[] entry.",
  detailed:
    "Produce a detailed summary of 2–4 paragraphs covering the main themes, important arguments, and conclusions. " +
    "Put each paragraph in its own sections[] entry.",
  bullet:
    "Produce a bullet-point summary with 5–10 concise bullets. " +
    "Put each bullet in its own sections[] entry (without a leading hyphen). " +
    "Focus on the most important ideas and findings.",
};

export type SummaryPromptInput = {
  summaryType: SummaryType;
  documentTitle?: string;
  sourceText: string;
};

/**
 * System instructions for a summary request.
 */
export function buildSummaryInstructions(summaryType: SummaryType): string {
  return [
    BASE_INSTRUCTIONS,
    "",
    SUMMARY_TYPE_GUIDANCE[summaryType],
    "",
    SUMMARY_CITATION_FORMAT,
  ].join("\n");
}

/**
 * User input payload containing labeled document excerpts.
 */
export function buildSummaryInput(input: SummaryPromptInput): string {
  const titleLine = input.documentTitle
    ? `Document: ${input.documentTitle}\n\n`
    : "";

  return (
    `${titleLine}Summarize the following document excerpts.\n` +
    `Each excerpt is labeled with its page number (e.g. [Page 3, Section 1]).\n\n` +
    `<source>\n${input.sourceText}\n</source>`
  );
}

/** Suggested output token budgets by summary type (includes JSON overhead). */
export function getSummaryMaxOutputTokens(summaryType: SummaryType): number {
  switch (summaryType) {
    case "short":
      return 500;
    case "detailed":
      return 1600;
    case "bullet":
      return 1100;
  }
}
