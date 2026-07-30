"use client";

import { useCallback, useState } from "react";

import type { SummaryResult, SummaryType } from "@/features/ai";
import { formatPageCitations } from "@/features/citations";
import { getApiErrorMessage } from "@/utils";

export type SummaryUiStatus = "idle" | "loading" | "success" | "error";

export type SummaryCopyState = "idle" | "copied" | "failed";

export type UseSummaryOptions = {
  storagePath: string;
  fileName: string;
};

export type UseSummaryState = {
  activeType: SummaryType | null;
  summary: SummaryResult | null;
  status: SummaryUiStatus;
  error: string | null;
  copyState: SummaryCopyState;
  generate: (summaryType: SummaryType) => Promise<void>;
  regenerate: () => Promise<void>;
  copySummary: () => Promise<void>;
};

/**
 * Client hook for on-demand AI summary generation in the reader.
 */
export function useSummary({
  storagePath,
  fileName,
}: UseSummaryOptions): UseSummaryState {
  const [activeType, setActiveType] = useState<SummaryType | null>(null);
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [status, setStatus] = useState<SummaryUiStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<SummaryCopyState>("idle");

  const generate = useCallback(
    async (summaryType: SummaryType, options?: { regenerate?: boolean }) => {
      setActiveType(summaryType);
      setStatus("loading");
      setError(null);
      setCopyState("idle");

      try {
        const response = await fetch("/api/documents/summarize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            storagePath,
            summaryType,
            originalFileName: fileName,
            ...(options?.regenerate ? { regenerate: true } : {}),
          }),
        });

        const payload = (await response.json()) as
          | { ok: true; data: SummaryResult }
          | { ok: false; error: unknown };

        if (!response.ok || !payload.ok) {
          setStatus("error");
          setError(
            payload.ok === false
              ? getApiErrorMessage(payload.error, "Unable to generate summary.")
              : "Unable to generate summary.",
          );
          return;
        }

        setSummary(payload.data);
        setStatus("success");
      } catch {
        setStatus("error");
        setError("Network error while generating summary.");
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
      // Keep the generated summary visible — copy failure is not a generation error.
      setCopyState("failed");
      window.setTimeout(() => {
        setCopyState("idle");
      }, 2500);
    }
  }, [summary]);

  return {
    activeType,
    summary,
    status,
    error,
    copyState,
    generate,
    regenerate,
    copySummary,
  };
}
