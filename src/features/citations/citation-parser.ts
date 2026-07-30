/**
 * Parse structured citation payloads returned by the AI model.
 */

import { logger } from "@/lib/logger";

import {
  flattenSectionPages,
  normalizePages,
} from "./citation-utils";
import type { CitedAnswer, CitedSection, CitedSummary } from "./types";

/** TEMPORARY — Gemini response metadata for success-path parse diagnostics. */
export type GeminiResponseDiagnostics = {
  finishReason: string | null;
  outputTokenCount: number | null;
  thoughtsTokenCount: number | null;
  totalTokenCount: number | null;
  candidateCount: number;
  responseTextLength: number;
};

let pendingGeminiResponseDiagnostics: GeminiResponseDiagnostics | null = null;

/**
 * TEMPORARY — stash Gemini metadata so parseCitedSummary can log it on success.
 * Does not affect parsing behavior.
 */
export function setPendingGeminiResponseDiagnostics(
  diagnostics: GeminiResponseDiagnostics,
): void {
  pendingGeminiResponseDiagnostics = diagnostics;
}

/**
 * TEMPORARY — emit combined Gemini + parse diagnostics once, then clear.
 * Never logs document or summary text.
 */
function flushGeminiParseDiagnostics(
  parsed: unknown,
  jsonParseSucceeded: boolean,
): void {
  const pending = pendingGeminiResponseDiagnostics;
  if (!pending) {
    return;
  }

  pendingGeminiResponseDiagnostics = null;

  const hasSections = isRecord(parsed) && Array.isArray(parsed.sections);

  logger.warn("Gemini success-path parse diagnostics", {
    finishReason: pending.finishReason,
    outputTokenCount: pending.outputTokenCount,
    thoughtsTokenCount: pending.thoughtsTokenCount,
    totalTokenCount: pending.totalTokenCount,
    candidateCount: pending.candidateCount,
    responseTextLength: pending.responseTextLength,
    jsonParseSucceeded,
    hasSections,
    ...(hasSections
      ? { sectionsLength: (parsed as { sections: unknown[] }).sections.length }
      : {}),
  });
}

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();

  // Entire payload is a single fenced block.
  const whole = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (whole?.[1]) {
    return whole[1].trim();
  }

  // Defensive: model returned prose wrapping a fenced JSON block.
  const embedded = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (embedded?.[1]) {
    return embedded[1].trim();
  }

  return trimmed;
}

/**
 * Unwrap JSON that was double-encoded as a string, or wrapped in a
 * single-element array — without changing the expected citation schema.
 */
function normalizeParsedJson(value: unknown): unknown {
  let current = value;

  for (let depth = 0; depth < 2; depth += 1) {
    if (typeof current !== "string") {
      break;
    }

    const trimmed = current.trim();
    const looksLikeJson =
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'));

    if (!looksLikeJson) {
      break;
    }

    try {
      current = JSON.parse(trimmed) as unknown;
    } catch {
      break;
    }
  }

  if (Array.isArray(current) && current.length === 1 && isRecord(current[0])) {
    return current[0];
  }

  return current;
}

type ExtractJsonResult = {
  cleaned: string;
  value: unknown | null;
  parseError: string | null;
};

function extractJsonObject(raw: string): ExtractJsonResult {
  const cleaned = stripCodeFences(raw.replace(/^\uFEFF/, ""));
  let parseError: string | null = null;

  try {
    return {
      cleaned,
      value: normalizeParsedJson(JSON.parse(cleaned) as unknown),
      parseError: null,
    };
  } catch (error) {
    parseError = error instanceof Error ? error.message : String(error);
  }

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return { cleaned, value: null, parseError };
  }

  try {
    return {
      cleaned,
      value: normalizeParsedJson(
        JSON.parse(cleaned.slice(start, end + 1)) as unknown,
      ),
      parseError,
    };
  } catch (error) {
    return {
      cleaned,
      value: null,
      parseError: error instanceof Error ? error.message : String(error),
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSection(
  value: unknown,
  allowedPages?: ReadonlySet<number>,
): CitedSection | null {
  if (!isRecord(value)) {
    return null;
  }

  const text =
    typeof value.text === "string"
      ? value.text.trim()
      : typeof value.content === "string"
        ? value.content.trim()
        : "";

  if (!text) {
    return null;
  }

  return {
    text,
    pages: normalizePages(value.pages ?? value.pageNumbers, allowedPages),
  };
}

/**
 * Parse a cited summary JSON payload.
 * Falls back to a single uncited section when JSON is missing/invalid.
 */
export function parseCitedSummary(
  raw: string,
  allowedPages?: ReadonlySet<number>,
): CitedSummary {
  const { value: parsed } = extractJsonObject(raw);
  const parseOk = parsed !== null;

  if (isRecord(parsed) && Array.isArray(parsed.sections)) {
    const sections = parsed.sections
      .map((section) => parseSection(section, allowedPages))
      .filter((section): section is CitedSection => section !== null);

    if (sections.length > 0) {
      flushGeminiParseDiagnostics(parsed, parseOk);
      return {
        sections,
        pages: flattenSectionPages(sections),
      };
    }
  }

  // Some models may return a top-level `content` / `summary` string + pages.
  if (isRecord(parsed)) {
    const text =
      typeof parsed.content === "string"
        ? parsed.content.trim()
        : typeof parsed.summary === "string"
          ? parsed.summary.trim()
          : typeof parsed.answer === "string"
            ? parsed.answer.trim()
            : "";

    if (text) {
      const pages = normalizePages(
        parsed.pages ?? parsed.pageNumbers,
        allowedPages,
      );

      flushGeminiParseDiagnostics(parsed, parseOk);
      return {
        sections: [{ text, pages }],
        pages,
      };
    }
  }

  const fallback = raw.trim();

  flushGeminiParseDiagnostics(parsed, parseOk);

  return {
    sections: fallback ? [{ text: fallback, pages: [] }] : [],
    pages: [],
  };
}

/**
 * Parse a cited chat answer JSON payload.
 * Falls back to plain text with no citations when JSON is missing/invalid.
 */
export function parseCitedAnswer(
  raw: string,
  allowedPages?: ReadonlySet<number>,
): CitedAnswer {
  const parsed = extractJsonObject(raw).value;

  if (isRecord(parsed)) {
    const answer =
      typeof parsed.answer === "string"
        ? parsed.answer.trim()
        : typeof parsed.content === "string"
          ? parsed.content.trim()
          : typeof parsed.text === "string"
            ? parsed.text.trim()
            : "";

    if (answer) {
      return {
        answer,
        pages: normalizePages(parsed.pages ?? parsed.pageNumbers, allowedPages),
      };
    }
  }

  return {
    answer: raw.trim(),
    pages: [],
  };
}

/** Prompt instructions for structured citation JSON (summaries). */
export const SUMMARY_CITATION_FORMAT = [
  "Return ONLY valid JSON (no markdown fences, no commentary) matching:",
  '{ "sections": [ { "text": "summary section text", "pages": [1, 2] } ] }',
  "",
  "Citation rules:",
  "- Put each paragraph or bullet in its own sections[] entry.",
  "- For bullet summaries, omit the leading hyphen in text; the UI will add it.",
  "- pages must list only page numbers that appear in the source labels (e.g. [Page 3, ...]).",
  "- Never invent page numbers. If unsure, use an empty pages array for that section.",
  "- Prefer the pages that actually support the claim in that section.",
].join("\n");

/** Prompt instructions for structured citation JSON (chat). */
export const CHAT_CITATION_FORMAT = [
  "Return ONLY valid JSON (no markdown fences, no commentary) matching:",
  '{ "answer": "your reply", "pages": [3, 5] }',
  "",
  "Citation rules:",
  "- pages must list only page numbers that appear in the Context labels (e.g. [Page 3, ...]).",
  "- Include every page that supports the answer. Prefer ranges of supporting pages when relevant.",
  "- Never invent page numbers. If the answer cannot be found, set pages to [].",
  `- If the answer cannot be found, set answer to exactly the required not-found sentence and pages to [].`,
].join("\n");
