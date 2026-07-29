/**
 * Parse structured citation payloads returned by the AI model.
 */

import {
  flattenSectionPages,
  normalizePages,
} from "./citation-utils";
import type { CitedAnswer, CitedSection, CitedSummary } from "./types";

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  return trimmed;
}

function extractJsonObject(raw: string): unknown | null {
  const cleaned = stripCodeFences(raw);

  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    // Fall through — try to locate the outermost object.
  }

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as unknown;
  } catch {
    return null;
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
  const parsed = extractJsonObject(raw);

  if (isRecord(parsed) && Array.isArray(parsed.sections)) {
    const sections = parsed.sections
      .map((section) => parseSection(section, allowedPages))
      .filter((section): section is CitedSection => section !== null);

    if (sections.length > 0) {
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

      return {
        sections: [{ text, pages }],
        pages,
      };
    }
  }

  const fallback = raw.trim();

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
  const parsed = extractJsonObject(raw);

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
