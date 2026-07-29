/**
 * AI summary types for the EchoReadly processing pipeline.
 */

import type { CitedSection } from "@/features/citations";

/** Supported summary formats generated from document chunks. */
export type SummaryType = "short" | "detailed" | "bullet";

/** Provider-agnostic error codes for AI operations. */
export type AiErrorCode =
  | "missing_api_key"
  | "rate_limit"
  | "api_error"
  | "empty_document"
  | "invalid_input";

export type AiError = {
  code: AiErrorCode;
  message: string;
};

/** Result of a summary generation request. */
export type SummaryResult = {
  documentId: string;
  summaryType: SummaryType;
  /** Plain-text join of sections (for copy / fallback). */
  content: string;
  /** Per-section text with supporting page citations. */
  sections: CitedSection[];
  generatedAt: string;
  model: string;
};

export type SummaryServiceResult =
  | { ok: true; data: SummaryResult }
  | { ok: false; error: AiError };

/** Default OpenAI model for document summaries. */
export const DEFAULT_SUMMARY_MODEL = "gpt-4.1-mini";

/** Maximum source characters sent to the model in a single request. */
export const MAX_SUMMARY_SOURCE_CHARS = 120_000;
