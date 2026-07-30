"use client";

import { cn } from "@/utils";

import type { ExportUiStatus } from "./types";

type ExportButtonProps = {
  status: ExportUiStatus;
  error: string | null;
  lastFileName?: string | null;
  disabled?: boolean;
  onExport: () => void;
  label?: string;
  className?: string;
  compact?: boolean;
};

/**
 * Export control with progress, success, and friendly error states.
 */
export function ExportButton({
  status,
  error,
  lastFileName,
  disabled = false,
  onExport,
  label = "Export",
  className,
  compact = false,
}: ExportButtonProps) {
  const isExporting = status === "exporting";
  const isBusy = isExporting || disabled;

  const buttonLabel =
    status === "exporting"
      ? "Exporting…"
      : status === "success"
        ? "Exported"
        : status === "error"
          ? "Retry export"
          : label;

  return (
    <div className={cn("inline-flex flex-col gap-1", className)}>
      <button
        type="button"
        onClick={onExport}
        disabled={isBusy}
        aria-busy={isExporting || undefined}
        aria-label={
          status === "exporting"
            ? "Exporting audio"
            : status === "success"
              ? "Audio exported"
              : status === "error"
                ? "Retry audio export"
                : "Export audio as MP3"
        }
        className={cn(
          "inline-flex h-9 min-h-9 items-center justify-center rounded-full border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          status === "success" &&
            "border-success/35 bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-success",
          status === "error" &&
            "border-danger/35 bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-danger",
          status !== "success" &&
            status !== "error" &&
            "border-border/80 bg-background/60 text-foreground hover:bg-surface-muted",
          isBusy && "cursor-not-allowed opacity-50",
          compact && "px-3",
        )}
      >
        {buttonLabel}
      </button>

      {status === "exporting" ? (
        <p role="status" className="text-[0.7rem] text-muted">
          Preparing MP3…
        </p>
      ) : null}

      {status === "success" ? (
        <p role="status" className="text-[0.7rem] text-success">
          {lastFileName
            ? `Downloaded ${lastFileName}`
            : "Download started."}
        </p>
      ) : null}

      {status === "error" && error ? (
        <p role="status" className="max-w-[14rem] text-[0.7rem] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
