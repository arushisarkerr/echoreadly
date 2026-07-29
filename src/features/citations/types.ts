/**
 * Shared citation types for AI summaries and chat answers.
 */

/** A contiguous or discrete set of source page numbers. */
export type PageCitation = {
  /** Sorted unique 1-based page numbers. */
  pages: number[];
};

/** One summary paragraph / bullet with supporting page refs. */
export type CitedSection = {
  text: string;
  pages: number[];
};

/** Parsed summary payload with per-section citations. */
export type CitedSummary = {
  sections: CitedSection[];
  /** Unique pages across all sections. */
  pages: number[];
};

/** Parsed chat answer with supporting page refs. */
export type CitedAnswer = {
  answer: string;
  pages: number[];
};
