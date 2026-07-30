/**
 * Page citation parsing and formatting for AI outputs.
 */

export {
  parseCitedAnswer,
  parseCitedSummary,
  CHAT_CITATION_FORMAT,
  SUMMARY_CITATION_FORMAT,
} from "./citation-parser";
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
