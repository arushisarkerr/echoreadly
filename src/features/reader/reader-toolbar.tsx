"use client";

import Link from "next/link";

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
 * Fixed reader header with navigation and zoom controls.
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
    ? `Page ${pageNumber} of ${numPages}`
    : `Page ${pageNumber}`;

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-none flex-col gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/library"
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
          >
            Back to Library
          </Link>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight text-foreground">
              {fileName}
            </p>
            <p className="text-xs text-muted">{pageLabel}</p>
          </div>

          {onToggleSummary ? (
            <ToolbarButton
              label={summaryOpen ? "Hide summary" : "AI Summary"}
              disabled={disabled}
              active={summaryOpen}
              onClick={onToggleSummary}
            />
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ToolbarButton
            label="Previous"
            disabled={disabled || pageNumber <= 1}
            onClick={onPreviousPage}
          />
          <ToolbarButton
            label="Next"
            disabled={disabled || !numPages || pageNumber >= numPages}
            onClick={onNextPage}
          />
          <span className="mx-1 hidden h-4 w-px bg-border sm:block" aria-hidden="true" />
          <ToolbarButton
            label="Zoom out"
            disabled={disabled}
            onClick={onZoomOut}
          />
          <span className="min-w-12 text-center text-xs text-muted">
            {fitMode === "custom" ? `${Math.round(scale * 100)}%` : fitMode === "width" ? "Width" : "Page"}
          </span>
          <ToolbarButton
            label="Zoom in"
            disabled={disabled}
            onClick={onZoomIn}
          />
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
                label="Listen Current Page"
                disabled={disabled || listenPageDisabled}
                onClick={onListenPage}
              />
            </>
          ) : null}
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
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium transition-colors",
        active
          ? "border-foreground/20 bg-surface-muted text-foreground"
          : "border-border bg-surface text-foreground hover:bg-surface-muted",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {label}
    </button>
  );
}
