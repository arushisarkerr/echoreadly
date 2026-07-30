/**
 * Parse structured citation payloads returned by the AI model.
 *
 * Supports the canonical EchoReadly schema plus common Gemini JSON-mode
 * variants (string sections, nested wrappers, alternate field names).
 */

import {
  flattenSectionPages,
  normalizePages,
} from "./citation-utils";
import type { CitedAnswer, CitedSection, CitedSummary } from "./types";

const SECTION_TEXT_KEYS = [
  "text",
  "content",
  "summary",
  "body",
  "paragraph",
  "bullet",
  "item",
  "section",
] as const;

const SECTION_LIST_KEYS = [
  "sections",
  "summary_sections",
  "items",
  "paragraphs",
  "bullets",
  "points",
] as const;

const WRAPPER_KEYS = [
  "data",
  "result",
  "response",
  "output",
  "payload",
  "summary",
] as const;

const PAGE_LIST_KEYS = ["pages", "pageNumbers", "page_numbers", "citations"] as const;

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

function extractJsonObject(raw: string): unknown | null {
  const cleaned = stripCodeFences(raw.replace(/^\uFEFF/, ""));

  try {
    return normalizeParsedJson(JSON.parse(cleaned) as unknown);
  } catch {
    // Fall through — try to locate the outermost object or array.
  }

  const objectStart = cleaned.indexOf("{");
  const objectEnd = cleaned.lastIndexOf("}");
  const arrayStart = cleaned.indexOf("[");
  const arrayEnd = cleaned.lastIndexOf("]");

  const candidates: string[] = [];

  if (objectStart !== -1 && objectEnd > objectStart) {
    candidates.push(cleaned.slice(objectStart, objectEnd + 1));
  }

  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    // Prefer an outer array only when it appears before any object,
    // or when no object candidate exists.
    if (objectStart === -1 || arrayStart < objectStart) {
      candidates.unshift(cleaned.slice(arrayStart, arrayEnd + 1));
    } else {
      candidates.push(cleaned.slice(arrayStart, arrayEnd + 1));
    }
  }

  for (const candidate of candidates) {
    try {
      return normalizeParsedJson(JSON.parse(candidate) as unknown);
    } catch {
      // try next candidate
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getFieldIgnoreCase(
  record: Record<string, unknown>,
  names: readonly string[],
): unknown {
  for (const name of names) {
    if (name in record) {
      return record[name];
    }
  }

  const lowerToKey = new Map(
    Object.keys(record).map((key) => [key.toLowerCase(), key] as const),
  );

  for (const name of names) {
    const key = lowerToKey.get(name.toLowerCase());
    if (key !== undefined) {
      return record[key];
    }
  }

  return undefined;
}

function readSectionText(value: Record<string, unknown>): string {
  for (const name of SECTION_TEXT_KEYS) {
    const field = getFieldIgnoreCase(value, [name]);
    if (typeof field === "string" && field.trim()) {
      return field.trim();
    }
  }

  // Gemini sometimes nests the body: { text: { content: "..." } }
  const nestedText = getFieldIgnoreCase(value, ["text", "content", "summary"]);
  if (isRecord(nestedText)) {
    for (const name of SECTION_TEXT_KEYS) {
      const field = getFieldIgnoreCase(nestedText, [name]);
      if (typeof field === "string" && field.trim()) {
        return field.trim();
      }
    }
  }

  return "";
}

function readSectionPages(
  value: Record<string, unknown>,
  allowedPages?: ReadonlySet<number>,
): number[] {
  for (const name of PAGE_LIST_KEYS) {
    const field = getFieldIgnoreCase(value, [name]);
    if (field === undefined) {
      continue;
    }

    if (Array.isArray(field)) {
      return normalizePages(field, allowedPages);
    }

    // Singular page number / numeric string.
    if (typeof field === "number" || typeof field === "string") {
      return normalizePages([field], allowedPages);
    }
  }

  const singular = getFieldIgnoreCase(value, ["page", "pageNumber", "page_number"]);
  if (typeof singular === "number" || typeof singular === "string") {
    return normalizePages([singular], allowedPages);
  }

  return [];
}

function parseSection(
  value: unknown,
  allowedPages?: ReadonlySet<number>,
): CitedSection | null {
  // Gemini JSON mode often simplifies sections to plain strings.
  if (typeof value === "string") {
    const text = value.trim();
    return text ? { text, pages: [] } : null;
  }

  if (!isRecord(value)) {
    return null;
  }

  const text = readSectionText(value);
  if (!text) {
    return null;
  }

  return {
    text,
    pages: readSectionPages(value, allowedPages),
  };
}

/**
 * Coerce model `sections` values into a flat list.
 * Accepts arrays, a single section object, or an object-map of sections.
 */
function coerceSectionsList(value: unknown): unknown[] | null {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    return [value];
  }

  if (!isRecord(value)) {
    return null;
  }

  // Single section object: { text, pages }
  if (readSectionText(value)) {
    return [value];
  }

  const entries = Object.values(value);
  if (
    entries.length > 0 &&
    entries.every(
      (entry) =>
        typeof entry === "string" || isRecord(entry) || Array.isArray(entry),
    )
  ) {
    return entries;
  }

  return null;
}

function readSectionsFromRecord(
  record: Record<string, unknown>,
): unknown[] | null {
  for (const key of SECTION_LIST_KEYS) {
    const field = getFieldIgnoreCase(record, [key]);
    if (field === undefined) {
      continue;
    }

    const list = coerceSectionsList(field);
    if (list && list.length > 0) {
      return list;
    }
  }

  return null;
}

/**
 * Locate a sections list in canonical or Gemini-wrapped payloads.
 * Prefers explicit `sections` (and aliases) over wrapper/summary fallbacks.
 */
function findSectionsList(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (!isRecord(parsed)) {
    return null;
  }

  // 1. Canonical / aliased sections on the root object.
  const rootSections = readSectionsFromRecord(parsed);
  if (rootSections) {
    return rootSections;
  }

  // 2. Nested under common Gemini wrappers ({ data|result|summary: { sections } }).
  for (const key of WRAPPER_KEYS) {
    const inner = getFieldIgnoreCase(parsed, [key]);
    if (isRecord(inner)) {
      const nested = readSectionsFromRecord(inner);
      if (nested) {
        return nested;
      }

      // Wrapper object is itself a single section.
      if (readSectionText(inner)) {
        return [inner];
      }
    } else if (Array.isArray(inner)) {
      const list = coerceSectionsList(inner);
      if (list && list.length > 0) {
        return list;
      }
    }
  }

  // 3. Entire object is itself one section ({ text, pages }).
  if (readSectionText(parsed)) {
    return [parsed];
  }

  return null;
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
  const sectionValues = findSectionsList(parsed);

  if (sectionValues) {
    const sections = sectionValues
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
            : typeof parsed.text === "string"
              ? parsed.text.trim()
              : "";

    if (text) {
      const pages = readSectionPages(parsed, allowedPages);

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
        pages: readSectionPages(parsed, allowedPages),
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
