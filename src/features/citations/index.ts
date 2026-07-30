/**
 * Page citation parsing and formatting for AI outputs.
 */

export {
  parseCitedAnswer,
  parseCitedSummary,
  setPendingGeminiResponseDiagnostics,
  CHAT_CITATION_FORMAT,
  SUMMARY_CITATION_FORMAT,
} from "./citation-parser";
export type { GeminiResponseDiagnostics } from "./citation-parser";
export {
  collectAllowedPages,
  flattenSectionPages,
  formatPageCitations,
  normalizePages,
} from "./citation-utils";
export type {
  CitedAnswer,
  CitedSection,
  CitedSummary,
  PageCitation,
} from "./types";
