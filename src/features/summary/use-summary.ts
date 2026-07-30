"use client";

import { useCallback, useRef, useState } from "react";

import { consumeAiSse } from "@/features/ai/consume-sse";
import type { SummaryResult, SummaryType } from "@/features/ai";
import { formatPageCitations } from "@/features/citations";

export type SummaryUiStatus =
  | "idle"
  | "loading"
  | "streaming"
  | "success"
  | "error";

export type SummaryCopyState = "idle" | "copied" | "failed";

export type UseSummaryOptions = {
  storagePath: string;
  fileName: string;
};

export type UseSummaryState = {
  activeType: SummaryType | null;
  summary: SummaryResult | null;
  streamingText: string;
  status: SummaryUiStatus;
  error: string | null;
  copyState: SummaryCopyState;
  generate: (summaryType: SummaryType) => Promise<void>;
  regenerate: () => Promise<void>;
  stop: () => void;
  copySummary: () => Promise<void>;
};

/**
 * Client hook for on-demand AI summary generation with streaming.
 */
export function useSummary({
  storagePath,
  fileName,
}: UseSummaryOptions): UseSummaryState {
  const [activeType, setActiveType] = useState<SummaryType | null>(null);
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [status, setStatus] = useState<SummaryUiStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<SummaryCopyState>("idle");
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus((current) =>
      current === "loading" || current === "streaming" ? "idle" : current,
    );
  }, []);

  const generate = useCallback(
    async (summaryType: SummaryType, options?: { regenerate?: boolean }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setActiveType(summaryType);
      setStatus("loading");
      setError(null);
      setCopyState("idle");
      setStreamingText("");

      try {
        const response = await fetch("/api/documents/summarize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            storagePath,
            summaryType,
            originalFileName: fileName,
            stream: true,
            ...(options?.regenerate ? { regenerate: true } : {}),
          }),
          signal: controller.signal,
        });

        const result = await consumeAiSse<SummaryResult>(response, {
          signal: controller.signal,
          displayMode: "summary",
          onDisplayText: (text) => {
            setStreamingText(text);
            setStatus("streaming");
          },
        });

        if (controller.signal.aborted) {
          return;
        }

        if (!result.ok) {
          if (result.aborted) {
            setStatus(result.partialText ? "error" : "idle");
            if (result.partialText) {
              setStreamingText(result.partialText);
              setError("Generation stopped. You can retry.");
            }
            return;
          }
          setStatus("error");
          setError(result.error);
          if (result.partialText) {
            setStreamingText(result.partialText);
          }
          return;
        }

        setSummary(result.data);
        setStreamingText("");
        setStatus("success");
      } catch {
        if (controller.signal.aborted) {
          return;
        }
        setStatus("error");
        setError("Network error while generating summary.");
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [fileName, storagePath],
  );

  const regenerate = useCallback(async () => {
    if (!activeType) {
      return;
    }

    await generate(activeType, { regenerate: true });
  }, [activeType, generate]);

  const copySummary = useCallback(async () => {
    if (!summary) {
      return;
    }

    const text =
      summary.sections && summary.sections.length > 0
        ? summary.sections
            .map((section) => {
              const body =
                summary.summaryType === "bullet"
                  ? `- ${section.text}`
                  : section.text;
              const citation = formatPageCitations(section.pages);
              return citation ? `${body}\n${citation}` : body;
            })
            .join(summary.summaryType === "bullet" ? "\n" : "\n\n")
        : summary.content;

    if (!text.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
      window.setTimeout(() => {
        setCopyState("idle");
      }, 2000);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => {
        setCopyState("idle");
      }, 2500);
    }
  }, [summary]);

  return {
    activeType,
    summary,
    streamingText,
    status,
    error,
    copyState,
    generate,
    regenerate,
    stop,
    copySummary,
  };
}
