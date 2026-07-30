"use client";

import Link from "next/link";

import { ROUTES } from "@/constants";
import { cn } from "@/utils";

import type { ReaderFitMode } from "./use-reader";

type ReaderToolbarProps = {
  fileName: string;
  pageNumber: number;
  numPages: number | null;
  scale: number;
  fitMode: ReaderFitMode;
  disabled?: boolean;
  summaryOpen?: boolean;
  onToggleSummary?: () => void;
  onListenPage?: () => void;
  listenPageDisabled?: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitWidth: () => void;
  onFitPage: () => void;
};

/**
 * Listening Studio chrome — navigation and zoom; logic unchanged.
 */
export function ReaderToolbar({
  fileName,
  pageNumber,
  numPages,
  scale,
  fitMode,
  disabled = false,
  summaryOpen = false,
  onToggleSummary,
  onListenPage,
  listenPageDisabled = false,
  onPreviousPage,
  onNextPage,
  onZoomIn,
  onZoomOut,
  onFitWidth,
  onFitPage,
}: ReaderToolbarProps) {
  const pageLabel = numPages
    ? `${pageNumber} / ${numPages}`
    : `${pageNumber}`;

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-[color-mix(in_srgb,var(--surface)_72%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex w-full flex-col gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href={ROUTES.library}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-border/80 bg-background/50 px-3.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted"
          >
            ← Shelf
          </Link>

          <div className="min-w-0 flex-1">
            <p className="text-[0.6rem] font-semibold tracking-[0.18em] text-accent uppercase">
              Listening studio
            </p>
            <p className="truncate text-sm font-semibold tracking-tight text-foreground">
              {fileName}
            </p>
          </div>

          <span className="hidden rounded-full border border-border/70 px-3 py-1.5 text-xs tabular-nums text-muted sm:inline-flex">
            {pageLabel}
          </span>

          {onToggleSummary ? (
            <ToolbarButton
              label={summaryOpen ? "Hide AI" : "AI panel"}
              disabled={disabled}
              active={summaryOpen}
              onClick={onToggleSummary}
              emphasis
            />
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <ToolbarButton
            label="Prev"
            disabled={disabled || pageNumber <= 1}
            onClick={onPreviousPage}
          />
          <ToolbarButton
            label="Next"
            disabled={disabled || !numPages || pageNumber >= numPages}
            onClick={onNextPage}
          />
          <span className="mx-1 hidden h-4 w-px bg-border sm:block" aria-hidden="true" />
          <ToolbarButton label="−" disabled={disabled} onClick={onZoomOut} />
          <span className="min-w-12 text-center text-xs tabular-nums text-muted">
            {fitMode === "custom"
              ? `${Math.round(scale * 100)}%`
              : fitMode === "width"
                ? "Width"
                : "Page"}
          </span>
          <ToolbarButton label="+" disabled={disabled} onClick={onZoomIn} />
          <ToolbarButton
            label="Fit width"
            disabled={disabled}
            active={fitMode === "width"}
            onClick={onFitWidth}
          />
          <ToolbarButton
            label="Fit page"
            disabled={disabled}
            active={fitMode === "page"}
            onClick={onFitPage}
          />
          {onListenPage ? (
            <>
              <span
                className="mx-1 hidden h-4 w-px bg-border sm:block"
                aria-hidden="true"
              />
              <ToolbarButton
                label="Listen page"
                disabled={disabled || listenPageDisabled}
                onClick={onListenPage}
                emphasis
              />
            </>
          ) : null}
          <div className="ml-auto hidden items-center gap-1.5 lg:flex">
            {["Transcript", "Translate", "Bookmarks", "Chapters", "Notes"].map(
              (label) => (
                <button
                  key={label}
                  type="button"
                  disabled
                  className="rounded-full border border-dashed border-border/70 px-2.5 py-1 text-[0.65rem] font-medium text-subtle"
                >
                  {label}
                </button>
              ),
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function ToolbarButton({
  label,
  onClick,
  disabled,
  active,
  emphasis,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  emphasis?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        emphasis && !active
          ? "border-foreground bg-foreground text-background hover:opacity-90"
          : active
            ? "border-accent/40 bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-foreground"
            : "border-border/80 bg-background/40 text-foreground hover:bg-surface-muted",
        disabled && "cursor-not-allowed opacity-45",
      )}
    >
      {label}
    </button>
  );
}
