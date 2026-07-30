"use client";

import type { SummaryResult } from "@/features/ai";
import { formatPageCitations } from "@/features/citations";
import { ExportButton } from "@/features/export";
import { cn } from "@/utils";

import { SummaryError } from "./error";
import { SummaryLoading } from "./loading";
import type { SummaryCopyState, SummaryUiStatus } from "./use-summary";

type SummaryContentProps = {
  status: SummaryUiStatus;
  summary: SummaryResult | null;
  streamingText?: string;
  error: string | null;
  copyState: SummaryCopyState;
  listenDisabled?: boolean;
  onRegenerate: () => void;
  onCopy: () => void;
  onRetry: () => void;
  onStop?: () => void;
  onListen?: () => void;
  onExport?: () => void;
  exportDisabled?: boolean;
  exportStatus?: "idle" | "exporting" | "success" | "error";
  exportError?: string | null;
  exportFileName?: string | null;
};

/**
 * Summary body: empty, loading, error, or generated content with citations.
 */
export function SummaryContent({
  status,
  summary,
  streamingText = "",
  error,
  copyState,
  listenDisabled = false,
  onRegenerate,
  onCopy,
  onRetry,
  onStop,
  onListen,
  onExport,
  exportDisabled = false,
  exportStatus = "idle",
  exportError = null,
  exportFileName = null,
}: SummaryContentProps) {
  if (status === "loading" && !streamingText) {
    return <SummaryLoading />;
  }

  if ((status === "streaming" || status === "loading") && streamingText) {
    return (
      <div className="flex flex-col gap-3" role="status" aria-live="polite">
        <div className="flex flex-wrap gap-2">
          {onStop ? (
            <ActionButton onClick={onStop} label="Stop" />
          ) : null}
        </div>
        <article className="rounded-[1.25rem] border border-border/70 bg-background/50 p-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
          {streamingText}
          <span
            className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-accent align-middle"
            aria-hidden="true"
          />
        </article>
        <p className="text-[0.7rem] text-subtle">Preparing listen mode…</p>
      </div>
    );
  }

  if (status === "error" && error) {
    return (
      <div className="space-y-3">
        {streamingText ? (
          <article className="rounded-[1.25rem] border border-border/70 bg-background/50 p-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
            {streamingText}
          </article>
        ) : null}
        <SummaryError message={error} onRetry={onRetry} />
      </div>
    );
  }

  if (status === "success" && summary) {
    const sections =
      summary.sections && summary.sections.length > 0
        ? summary.sections
        : [{ text: summary.content, pages: [] as number[] }];
    const isBullet = summary.summaryType === "bullet";

    return (
      <div className="flex flex-col gap-4">
        <div className="sticky top-0 z-10 -mx-1 flex flex-wrap gap-2 bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-1 py-1 backdrop-blur-md">
          <ActionButton
            onClick={onCopy}
            label={
              copyState === "copied"
                ? "Copied"
                : copyState === "failed"
                  ? "Copy failed"
                  : "Copy"
            }
            ariaLabel={
              copyState === "copied"
                ? "Copied"
                : copyState === "failed"
                  ? "Copy failed, try again"
                  : "Copy"
            }
            tone={
              copyState === "copied"
                ? "success"
                : copyState === "failed"
                  ? "danger"
                  : "default"
            }
          />
          <ActionButton onClick={onRegenerate} label="Regenerate" />
          {onListen ? (
            <ActionButton
              onClick={onListen}
              label="Listen"
              disabled={listenDisabled}
              ariaLabel="Listen"
            />
          ) : null}
          {onExport ? (
            <ExportButton
              status={exportStatus}
              error={exportError}
              lastFileName={exportFileName}
              disabled={exportDisabled}
              onExport={onExport}
              label="Export"
              compact
            />
          ) : null}
        </div>

        {copyState === "failed" ? (
          <p role="status" className="text-xs font-medium text-danger">
            Clipboard permission denied. Select the text or try again.
          </p>
        ) : null}
        {copyState === "copied" ? (
          <p role="status" className="sr-only">
            Copied to clipboard.
          </p>
        ) : null}

        <article
          aria-label="Listening mode text"
          className="mx-auto w-full rounded-[1.25rem] border border-border/70 bg-background/50 p-4 sm:p-5"
          style={{
            maxWidth: "var(--reader-content-max)",
            fontSize: "calc(0.9375rem * var(--reader-font-scale))",
          }}
        >
          {isBullet ? (
            <ul className="list-none space-y-3 p-0">
              {sections.map((section, index) => {
                const citation = formatPageCitations(section.pages);
                return (
                  <li
                    key={`${index}-${section.text.slice(0, 24)}`}
                    className="flex gap-3"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-accent"
                    />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="text-[0.9375rem] leading-[1.65] text-foreground">
                        {section.text}
                      </p>
                      {citation ? <CitationChip label={citation} /> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="space-y-5">
              {sections.map((section, index) => {
                const citation = formatPageCitations(section.pages);
                const paragraphs = splitParagraphs(section.text);

                return (
                  <section
                    key={`${index}-${section.text.slice(0, 24)}`}
                    className="space-y-2.5"
                  >
                    {paragraphs.map((paragraph, pIndex) => (
                      <p
                        key={pIndex}
                        className="text-[0.9375rem] leading-[1.7] text-foreground"
                      >
                        {paragraph}
                      </p>
                    ))}
                    {citation ? <CitationChip label={citation} /> : null}
                  </section>
                );
              })}
            </div>
          )}
        </article>

        <p className="text-[0.7rem] text-subtle">
          Generated with {summary.model}
          {summary.summaryType ? ` · ${summary.summaryType}` : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.25rem] border border-dashed border-border/80 bg-surface/40 px-4 py-10 text-center">
      <p className="font-display text-base font-semibold text-foreground">
        Choose a listening mode
      </p>
      <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-relaxed text-muted">
        Choose Short, Detailed, or Bullet above to generate an on-demand AI
        listening mode for this document.
      </p>
    </div>
  );
}

function splitParagraphs(text: string): string[] {
  const parts = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length > 0) {
    return parts;
  }
  return text.trim() ? [text.trim()] : [];
}

function CitationChip({ label }: { label: string }) {
  return (
    <p className="inline-flex rounded-full border border-border/70 bg-surface/70 px-2.5 py-0.5 text-[0.7rem] font-medium tracking-wide text-subtle">
      {label}
    </p>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  ariaLabel,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      className={cn(
        "inline-flex h-9 min-h-9 items-center justify-center rounded-full border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        tone === "success" &&
          "border-success/35 bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-success",
        tone === "danger" &&
          "border-danger/35 bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-danger",
        tone === "default" &&
          "border-border/80 bg-background/60 text-foreground hover:bg-surface-muted",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {label}
    </button>
  );
}
