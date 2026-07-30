import Link from "next/link";

import { ROUTES } from "@/constants";
import { cn } from "@/utils";

type FilePreviewProps = {
  name: string;
  sizeLabel: string;
  sizeBytes?: number;
  status: "ready" | "uploading" | "success" | "failed";
  progressPercent?: number | null;
  statusMessage?: string | null;
  softNotice?: string | null;
  onReplace: () => void;
  onRemove: () => void;
};

/** Soft threshold for “large file” UX copy — does not change upload limits. */
const LARGE_FILE_HINT_BYTES = 20 * 1024 * 1024;

/**
 * Selected PDF preview with upload-ready, progress, success, and failure states.
 */
export function FilePreview({
  name,
  sizeLabel,
  sizeBytes,
  status,
  progressPercent = null,
  statusMessage = null,
  softNotice = null,
  onReplace,
  onRemove,
}: FilePreviewProps) {
  const uploading = status === "uploading";
  const hasDeterminateProgress = typeof progressPercent === "number";
  const progressWidth = hasDeterminateProgress
    ? `${Math.min(100, Math.max(0, progressPercent))}%`
    : "40%";
  const showLargeHint =
    typeof sizeBytes === "number" &&
    sizeBytes >= LARGE_FILE_HINT_BYTES &&
    (status === "ready" || status === "uploading");

  return (
    <div
      className={cn(
        "rounded-[1.5rem] border p-4 sm:p-5",
        status === "failed"
          ? "border-danger/40 bg-[color-mix(in_srgb,var(--danger)_6%,transparent)]"
          : status === "success"
            ? "border-success/35 bg-[color-mix(in_srgb,var(--success)_8%,transparent)]"
            : "border-border/70 bg-surface/70",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-muted text-foreground"
        >
          <PdfGlyph className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {name}
            </p>
            {status === "ready" ? (
              <StatusChip tone="neutral">Ready</StatusChip>
            ) : null}
            {status === "uploading" ? (
              <StatusChip tone="accent">Uploading</StatusChip>
            ) : null}
            {status === "success" ? (
              <StatusChip tone="success">Imported</StatusChip>
            ) : null}
            {status === "failed" ? (
              <StatusChip tone="danger">Failed</StatusChip>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted">{sizeLabel}</p>

          {showLargeHint ? (
            <p className="mt-2 text-xs text-muted">
              Large file — upload may take a moment on slower connections.
            </p>
          ) : null}

          {softNotice && status === "ready" ? (
            <p className="mt-2 text-xs text-muted">{softNotice}</p>
          ) : null}

          {uploading ? (
            <div className="mt-4" role="status" aria-live="polite">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-muted">
                  {hasDeterminateProgress
                    ? `Uploading… ${Math.round(progressPercent)}%`
                    : "Uploading to secure storage…"}
                </p>
                {hasDeterminateProgress ? (
                  <span className="text-[0.7rem] tabular-nums text-subtle">
                    {Math.round(progressPercent)}%
                  </span>
                ) : null}
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-foreground/10"
                aria-hidden="true"
              >
                <div
                  className={cn(
                    "h-full rounded-full bg-accent transition-[width] duration-300",
                    !hasDeterminateProgress && "er-upload-indeterminate",
                  )}
                  style={{ width: progressWidth }}
                />
              </div>
              <p className="mt-2 text-[0.7rem] text-subtle">
                Keep this tab open until the upload finishes.
              </p>
            </div>
          ) : null}

          {statusMessage ? (
            <p
              role={status === "failed" ? "alert" : "status"}
              className={cn(
                "mt-3 text-xs leading-relaxed",
                status === "failed"
                  ? "font-medium text-danger"
                  : status === "success"
                    ? "text-muted"
                    : "text-subtle",
              )}
            >
              {statusMessage}
            </p>
          ) : null}

          {status === "ready" && !statusMessage ? (
            <p className="mt-2 text-xs text-subtle">
              Ready to upload · checked on this device (type & size)
            </p>
          ) : null}

          {status === "success" ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={ROUTES.library}
                className="inline-flex h-10 min-h-10 items-center justify-center rounded-full bg-foreground px-4 text-xs font-semibold text-background no-underline transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Open Library
              </Link>
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex h-10 min-h-10 items-center justify-center rounded-full border border-border bg-background px-4 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Import another
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {status !== "success" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onReplace}
            disabled={uploading}
            className={cn(
              "inline-flex h-10 min-h-10 items-center justify-center rounded-full border border-border bg-background px-4 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              uploading && "cursor-not-allowed opacity-50",
            )}
          >
            Replace
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={uploading}
            className={cn(
              "inline-flex h-10 min-h-10 items-center justify-center rounded-full px-4 text-xs font-semibold text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              uploading && "cursor-not-allowed opacity-50",
            )}
          >
            Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}

function StatusChip({
  children,
  tone,
}: {
  children: string;
  tone: "neutral" | "accent" | "success" | "danger";
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase",
        tone === "neutral" && "border-border bg-background text-muted",
        tone === "accent" &&
          "border-accent/30 bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-foreground",
        tone === "success" &&
          "border-success/30 bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-success",
        tone === "danger" &&
          "border-danger/30 bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-danger",
      )}
    >
      {children}
    </span>
  );
}

function PdfGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}
