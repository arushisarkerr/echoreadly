"use client";

import { useState } from "react";

import {
  DEFAULT_TARGET_LANGUAGE,
  type TargetLanguageCode,
} from "@/constants";
import type { SummaryType } from "@/features/ai";

import { requestTranslation } from "./translate-client";
import type {
  TranslateUiStatus,
  TranslationResult,
  TranslationScope,
  TranslationViewMode,
} from "./types";

export type UseTranslateState = {
  status: TranslateUiStatus;
  error: string | null;
  result: TranslationResult | null;
  scope: TranslationScope;
  targetLanguage: TargetLanguageCode;
  viewMode: TranslationViewMode;
  selectionText: string;
  summaryType: SummaryType;
  setScope: (scope: TranslationScope) => void;
  setTargetLanguage: (language: TargetLanguageCode) => void;
  setViewMode: (mode: TranslationViewMode) => void;
  setSelectionText: (text: string) => void;
  setSummaryType: (type: SummaryType) => void;
  translate: (input: {
    storagePath: string;
    fileName: string;
    pageNumber: number;
    documentId?: string | null;
    regenerate?: boolean;
  }) => Promise<void>;
  reset: () => void;
};

/**
 * Translation panel state — progress, cache result, original/translated toggle.
 */
export function useTranslate(): UseTranslateState {
  const [status, setStatus] = useState<TranslateUiStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [scope, setScope] = useState<TranslationScope>("page");
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguageCode>(
    DEFAULT_TARGET_LANGUAGE,
  );
  const [viewMode, setViewMode] = useState<TranslationViewMode>("translated");
  const [selectionText, setSelectionText] = useState("");
  const [summaryType, setSummaryType] = useState<SummaryType>("short");

  async function translate(input: {
    storagePath: string;
    fileName: string;
    pageNumber: number;
    documentId?: string | null;
    regenerate?: boolean;
  }) {
    setStatus("loading");
    setError(null);

    try {
      let response;

      if (scope === "summary") {
        if (!input.documentId) {
          setStatus("error");
          setError("Generate a summary first, then translate it.");
          return;
        }
        response = await requestTranslation({
          scope: "summary",
          documentId: input.documentId,
          summaryType,
          targetLanguage,
          regenerate: input.regenerate,
        });
      } else if (scope === "selection") {
        response = await requestTranslation({
          scope: "selection",
          storagePath: input.storagePath,
          originalFileName: input.fileName,
          text: selectionText,
          targetLanguage,
          regenerate: input.regenerate,
        });
      } else if (scope === "page") {
        response = await requestTranslation({
          scope: "page",
          storagePath: input.storagePath,
          originalFileName: input.fileName,
          pageNumber: input.pageNumber,
          targetLanguage,
          regenerate: input.regenerate,
        });
      } else {
        response = await requestTranslation({
          scope: "document",
          storagePath: input.storagePath,
          originalFileName: input.fileName,
          targetLanguage,
          regenerate: input.regenerate,
        });
      }

      if (!response.ok) {
        setStatus("error");
        setError(response.error);
        return;
      }

      setResult(response.data);
      setViewMode("translated");
      setStatus("success");
    } catch {
      setStatus("error");
      setError("Unable to translate.");
    }
  }

  return {
    status,
    error,
    result,
    scope,
    targetLanguage,
    viewMode,
    selectionText,
    summaryType,
    setScope,
    setTargetLanguage,
    setViewMode,
    setSelectionText,
    setSummaryType,
    translate,
    reset: () => {
      setStatus("idle");
      setError(null);
      setResult(null);
      setViewMode("translated");
    },
  };
}
