/**
 * Translation feature — cached AI document translation.
 * Server helpers: import from `@/features/translation/translate-service` directly.
 */

export { requestTranslation } from "./translate-client";
export { TranslationPanel } from "./translation-panel";
export { useTranslate, type UseTranslateState } from "./use-translate";
export type {
  TranslateRequestInput,
  TranslateUiStatus,
  TranslationResult,
  TranslationScope,
  TranslationViewMode,
} from "./types";
