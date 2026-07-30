/**
 * Translation feature types.
 */

import type { SummaryType } from "@/features/ai";
import type { TargetLanguageCode } from "@/constants";

export type TranslationScope =
  | "document"
  | "page"
  | "selection"
  | "summary";

export type TranslationViewMode = "original" | "translated";

export type DocumentTranslationRow = {
  id: string;
  user_id: string;
  document_id: string;
  scope: TranslationScope;
  page_number: number | null;
  summary_type: SummaryType | null;
  selection_hash: string | null;
  target_language: string;
  source_content_hash: string;
  source_text: string;
  translated_text: string;
  model: string;
  generated_at: string;
  created_at: string;
  updated_at: string;
};

export type TranslationResult = {
  translationId: string;
  documentId: string;
  scope: TranslationScope;
  pageNumber: number | null;
  summaryType: SummaryType | null;
  targetLanguage: TargetLanguageCode;
  sourceText: string;
  translatedText: string;
  sourceContentHash: string;
  model: string;
  cached: boolean;
  generatedAt: string;
};

export type TranslateRequestInput =
  | {
      scope: "document";
      storagePath: string;
      originalFileName?: string;
      targetLanguage: TargetLanguageCode;
      regenerate?: boolean;
    }
  | {
      scope: "page";
      storagePath: string;
      originalFileName?: string;
      pageNumber: number;
      targetLanguage: TargetLanguageCode;
      regenerate?: boolean;
    }
  | {
      scope: "selection";
      storagePath: string;
      originalFileName?: string;
      text: string;
      targetLanguage: TargetLanguageCode;
      regenerate?: boolean;
    }
  | {
      scope: "summary";
      documentId: string;
      summaryType: SummaryType;
      targetLanguage: TargetLanguageCode;
      regenerate?: boolean;
    };

export type TranslateUiStatus =
  | "idle"
  | "loading"
  | "success"
  | "error";
