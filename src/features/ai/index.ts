/**
 * AI feature module — provider abstraction and document summarization.
 */

export type { AiGenerateInput, AiGenerateOutput, AiGenerateResult, AiProvider } from "./ai-provider";
export { createOpenAiProvider, OpenAiProvider, type OpenAiProviderOptions } from "./openai-provider";
export {
  buildSummaryInput,
  buildSummaryInstructions,
  getSummaryMaxOutputTokens,
  type SummaryPromptInput,
} from "./prompts";
export {
  formatSummaryForCopy,
  generateDocumentSummary,
  getDefaultAiProvider,
  getDocumentSummary,
  resetSummaryCache,
  setDefaultAiProvider,
  type GenerateSummaryInput,
} from "./summary-service";
export {
  DEFAULT_SUMMARY_MODEL,
  MAX_SUMMARY_SOURCE_CHARS,
  type AiError,
  type AiErrorCode,
  type SummaryResult,
  type SummaryServiceResult,
  type SummaryType,
} from "./types";
