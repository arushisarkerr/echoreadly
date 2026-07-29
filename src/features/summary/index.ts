/**
 * AI summary feature module.
 */

export {
  generateDocumentSummary,
  getDocumentSummary,
  type SummaryResult,
  type SummaryType,
} from "@/features/ai";
export { SummaryError } from "./error";
export { SummaryLoading } from "./loading";
export { SummaryButtons } from "./summary-buttons";
export { SummaryContent } from "./summary-content";
export { SummaryPanel } from "./summary-panel";
export { useSummary, type SummaryUiStatus, type UseSummaryState } from "./use-summary";
