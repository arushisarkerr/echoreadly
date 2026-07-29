"use client";

import type { SummaryResult } from "@/features/ai";
import { formatPageCitations } from "@/features/citations";

import { SummaryError } from "./error";
import { SummaryLoading } from "./loading";
import type { SummaryUiStatus } from "./use-summary";

type SummaryContentProps = {
  status: SummaryUiStatus;
  summary: SummaryResult | null;
  error: string | null;
  copyState: "idle" | "copied";
  listenDisabled?: boolean;
  onRegenerate: () => void;
  onCopy: () => void;
  onRetry: () => void;
  onListen?: () => void;
};

/**
 * Summary body: empty, loading, error, or generated content with citations.
 */
export function SummaryContent({
  status,
  summary,
  error,
  copyState,
  listenDisabled = false,
  onRegenerate,
  onCopy,
  onRetry,
  onListen,
}: SummaryContentProps) {
  if (status === "loading") {
    return <SummaryLoading />;
  }

  if (status === "error" && error) {
    return <SummaryError message={error} onRetry={onRetry} />;
  }

  if (status === "success" && summary) {
    const sections =
      summary.sections && summary.sections.length > 0
        ? summary.sections
        : [{ text: summary.content, pages: [] as number[] }];

    return (
      <div className="space-y-4">
        <div className="space-y-4 rounded-md border border-border bg-surface-muted/40 p-4">
          {sections.map((section, index) => {
            const citation = formatPageCitations(section.pages);
            const body =
              summary.summaryType === "bullet"
                ? `- ${section.text}`
                : section.text;

            return (
              <div key={`${index}-${section.text.slice(0, 24)}`} className="space-y-1">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {body}
                </p>
                {citation ? (
                  <p className="text-xs font-medium text-subtle">{citation}</p>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
          >
            {copyState === "copied" ? "Copied" : "Copy summary"}
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
          >
            Regenerate summary
          </button>
          {onListen ? (
            <button
              type="button"
              disabled={listenDisabled}
              onClick={onListen}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Listen Summary
            </button>
          ) : null}
        </div>

        <p className="text-xs text-subtle">
          Generated with {summary.model}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-dashed border-border bg-surface-muted/30 px-4 py-8 text-center">
      <p className="text-sm font-medium text-foreground">No summary yet</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Choose Short, Detailed, or Bullet to generate an AI summary of this
        document.
      </p>
    </div>
  );
}
