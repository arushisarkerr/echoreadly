"use client";

import { useEffect, useRef, useState } from "react";

import { consumeAiSse } from "@/features/ai/consume-sse";
import {
  DEFAULT_TARGET_LANGUAGE,
  isSupportedTargetLanguage,
  type TargetLanguageCode,
} from "@/constants";
import type { SummaryType } from "@/features/ai";
import { loadUserPreferences } from "@/features/settings/preferences-client";

import type {
  TranslateUiStatus,
  TranslationResult,
  TranslationScope,
  TranslationViewMode,
} from "./types";

export type UseTranslateState = {
  status: TranslateUiStatus | "streaming";
  error: string | null;
  result: TranslationResult | null;
  streamingText: string;
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
  stop: () => void;
  reset: () => void;
};

/**
 * Translation panel state — streaming, cache result, original/translated toggle.
 */
export function useTranslate(): UseTranslateState {
  const [status, setStatus] = useState<TranslateUiStatus | "streaming">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [scope, setScope] = useState<TranslationScope>("page");
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguageCode>(
    DEFAULT_TARGET_LANGUAGE,
  );
  const [viewMode, setViewMode] = useState<TranslationViewMode>("translated");
  const [selectionText, setSelectionText] = useState("");
  const [summaryType, setSummaryType] = useState<SummaryType>("short");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadUserPreferences().then((result) => {
      if (cancelled || !result.ok) {
        return;
      }
      const language = result.data.preferences.preferredListeningLanguage;
      if (isSupportedTargetLanguage(language)) {
        setTargetLanguage(language);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function stop() {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus((current) =>
      current === "loading" || current === "streaming" ? "idle" : current,
    );
  }

  async function translate(input: {
    storagePath: string;
    fileName: string;
    pageNumber: number;
    documentId?: string | null;
    regenerate?: boolean;
  }) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setError(null);
    setStreamingText("");

    try {
      let payload:
        | {
            scope: TranslationScope;
            storagePath?: string;
            originalFileName?: string;
            pageNumber?: number;
            documentId?: string;
            summaryType?: SummaryType;
            text?: string;
            targetLanguage: TargetLanguageCode;
            regenerate?: boolean;
          }
        | null = null;

      if (scope === "summary") {
        if (!input.documentId) {
          setStatus("error");
          setError("Generate a summary first, then translate it.");
          return;
        }
        payload = {
          scope: "summary",
          documentId: input.documentId,
          summaryType,
          targetLanguage,
          regenerate: input.regenerate,
        };
      } else if (scope === "selection") {
        payload = {
          scope: "selection",
          storagePath: input.storagePath,
          originalFileName: input.fileName,
          text: selectionText,
          targetLanguage,
          regenerate: input.regenerate,
        };
      } else if (scope === "page") {
        payload = {
          scope: "page",
          storagePath: input.storagePath,
          originalFileName: input.fileName,
          pageNumber: input.pageNumber,
          targetLanguage,
          regenerate: input.regenerate,
        };
      } else {
        payload = {
          scope: "document",
          storagePath: input.storagePath,
          originalFileName: input.fileName,
          targetLanguage,
          regenerate: input.regenerate,
        };
      }

      const response = await fetch("/api/documents/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ ...payload, stream: true }),
        signal: controller.signal,
      });

      const streamed = await consumeAiSse<TranslationResult>(response, {
        signal: controller.signal,
        displayMode: "plain",
        onDisplayText: (text) => {
          setStreamingText(text);
          setStatus("streaming");
        },
      });

      if (controller.signal.aborted) {
        return;
      }

      if (!streamed.ok) {
        if (streamed.aborted) {
          setStatus(streamed.partialText ? "error" : "idle");
          if (streamed.partialText) {
            setStreamingText(streamed.partialText);
            setError("Translation stopped. You can retry.");
          }
          return;
        }
        setStatus("error");
        setError(streamed.error);
        if (streamed.partialText) {
          setStreamingText(streamed.partialText);
        }
        return;
      }

      setResult(streamed.data);
      setStreamingText("");
      setViewMode("translated");
      setStatus("success");
    } catch {
      if (controller.signal.aborted) {
        return;
      }
      setStatus("error");
      setError("Unable to translate.");
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }

  return {
    status,
    error,
    result,
    streamingText,
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
    stop,
    reset: () => {
      abortRef.current?.abort();
      abortRef.current = null;
      setStatus("idle");
      setError(null);
      setResult(null);
      setStreamingText("");
      setViewMode("translated");
    },
  };
}
