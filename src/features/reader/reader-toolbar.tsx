"use client";

import Link from "next/link";

import { ROUTES } from "@/constants";
import { ExportButton } from "@/features/export";
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
  onExportPage?: () => void;
  exportPageDisabled?: boolean;
  exportPageStatus?: "idle" | "exporting" | "success" | "error";
  exportPageError?: string | null;
  exportPageFileName?: string | null;
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
  onExportPage,
  exportPageDisabled = false,
  exportPageStatus = "idle",
  exportPageError = null,
  exportPageFileName = null,
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
  const pageShort = numPages ? `${pageNumber} / ${numPages}` : `${pageNumber}`;
  const zoomLabel =
    fitMode === "custom"
      ? `${Math.round(scale * 100)}%`
      : fitMode === "width"
        ? "Width"
        : "Page";

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-border/60 bg-[color-mix(in_srgb,var(--surface)_78%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex w-full flex-col gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href={ROUTES.library}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-border/80 bg-background/50 px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ← Shelf
          </Link>

          <div className="min-w-0 flex-1">
            <p className="text-[0.6rem] font-semibold tracking-[0.18em] text-accent uppercase">
              Listening studio
            </p>
            <p
              className="truncate text-sm font-semibold tracking-tight text-foreground"
              title={fileName}
            >
              {fileName}
            </p>
          </div>

          <span
            className="inline-flex shrink-0 rounded-full border border-border/70 px-2.5 py-1.5 text-[0.7rem] tabular-nums text-muted sm:px-3 sm:text-xs"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="sm:hidden">{pageShort}</span>
            <span className="hidden sm:inline">{pageLabel}</span>
          </span>

          {onToggleSummary ? (
            <ToolbarButton
              label={summaryOpen ? "Hide AI" : "AI panel"}
              ariaLabel={
                summaryOpen
                  ? "Hide AI summary and chat panel"
                  : "Open AI summary and chat panel"
              }
              disabled={disabled}
              active={summaryOpen}
              onClick={onToggleSummary}
              emphasis
            />
          ) : null}
        </div>

        <div
          className="flex flex-wrap items-center gap-1.5"
          role="toolbar"
          aria-label="Reader controls"
        >
          <div
            className="flex items-center gap-1.5"
            role="group"
            aria-label="Page navigation"
          >
            <ToolbarButton
              label="Prev"
              ariaLabel="Previous page"
              disabled={disabled || pageNumber <= 1}
              onClick={onPreviousPage}
            />
            <ToolbarButton
              label="Next"
              ariaLabel="Next page"
              disabled={disabled || !numPages || pageNumber >= numPages}
              onClick={onNextPage}
            />
          </div>

          <span
            className="mx-0.5 hidden h-4 w-px bg-border sm:block"
            aria-hidden="true"
          />

          <div
            className="flex items-center gap-1.5"
            role="group"
            aria-label="Zoom"
          >
            <ToolbarButton
              label="−"
              ariaLabel="Zoom out"
              disabled={disabled}
              onClick={onZoomOut}
            />
            <span
              className="min-w-12 text-center text-xs tabular-nums text-muted"
              aria-live="polite"
            >
              {zoomLabel}
            </span>
            <ToolbarButton
              label="+"
              ariaLabel="Zoom in"
              disabled={disabled}
              onClick={onZoomIn}
            />
            <ToolbarButton
              label="Width"
              ariaLabel="Fit to width"
              disabled={disabled}
              active={fitMode === "width"}
              onClick={onFitWidth}
            />
            <ToolbarButton
              label="Page"
              ariaLabel="Fit to page"
              disabled={disabled}
              active={fitMode === "page"}
              onClick={onFitPage}
            />
          </div>

          {onListenPage ? (
            <>
              <span
                className="mx-0.5 hidden h-4 w-px bg-border sm:block"
                aria-hidden="true"
              />
              <ToolbarButton
                label="Listen"
                ariaLabel="Listen to current page"
                disabled={disabled || listenPageDisabled}
                onClick={onListenPage}
                emphasis
              />
            </>
          ) : null}

          {onExportPage ? (
            <ExportButton
              status={exportPageStatus}
              error={exportPageError}
              lastFileName={exportPageFileName}
              disabled={disabled || exportPageDisabled}
              onExport={onExportPage}
              label="Export"
              compact
            />
          ) : null}
        </div>

        <p className="sr-only">
          Keyboard: Left and Right arrows change page. Plus and Minus zoom when
          the reader is focused. Open the AI panel for Summary and Chat.
        </p>
      </div>
    </header>
  );
}

function ToolbarButton({
  label,
  ariaLabel,
  onClick,
  disabled,
  active,
  emphasis,
  className,
}: {
  label: string;
  ariaLabel?: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      aria-pressed={active || undefined}
      className={cn(
        "inline-flex h-9 min-h-9 items-center justify-center rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        emphasis && !active
          ? "border-foreground bg-foreground text-background hover:opacity-90"
          : active
            ? "border-accent/40 bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-foreground"
            : "border-border/80 bg-background/40 text-foreground hover:bg-surface-muted",
        disabled && "cursor-not-allowed opacity-45",
        className,
      )}
    >
      {label}
    </button>
  );
}
