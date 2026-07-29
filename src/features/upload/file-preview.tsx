import { cn } from "@/utils";

type FilePreviewProps = {
  name: string;
  sizeLabel: string;
  status: "ready" | "uploading" | "success" | "failed";
  progressPercent?: number | null;
  statusMessage?: string | null;
  onReplace: () => void;
  onRemove: () => void;
};

/**
 * Selected PDF preview with upload-ready, progress, success, and failure states.
 */
export function FilePreview({
  name,
  sizeLabel,
  status,
  progressPercent = null,
  statusMessage = null,
  onReplace,
  onRemove,
}: FilePreviewProps) {
  const uploading = status === "uploading";
  const progressWidth =
    typeof progressPercent === "number"
      ? `${Math.min(100, Math.max(0, progressPercent))}%`
      : "66%";

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface-muted text-foreground"
        >
          <PdfGlyph className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">{name}</p>
            {status === "ready" ? (
              <span className="rounded-md border border-border bg-background px-2 py-0.5 text-[0.6875rem] font-medium tracking-wide text-muted uppercase">
                Ready
              </span>
            ) : null}
            {status === "success" ? (
              <span className="rounded-md border border-border bg-background px-2 py-0.5 text-[0.6875rem] font-medium tracking-wide text-success uppercase">
                Uploaded
              </span>
            ) : null}
            {status === "failed" ? (
              <span className="rounded-md border border-border bg-background px-2 py-0.5 text-[0.6875rem] font-medium tracking-wide text-danger uppercase">
                Failed
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted">{sizeLabel}</p>

          {uploading ? (
            <div className="mt-3" role="status" aria-live="polite">
              <p className="text-xs font-medium text-muted">
                {typeof progressPercent === "number"
                  ? `Uploading… ${Math.round(progressPercent)}%`
                  : "Uploading…"}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className={cn(
                    "h-full rounded-full bg-accent transition-[width]",
                    typeof progressPercent !== "number" && "animate-pulse",
                  )}
                  style={{ width: progressWidth }}
                />
              </div>
            </div>
          ) : null}

          {statusMessage ? (
            <p
              role={status === "failed" ? "alert" : "status"}
              className={cn(
                "mt-2 text-xs",
                status === "failed" ? "font-medium text-danger" : "text-subtle",
              )}
            >
              {statusMessage}
            </p>
          ) : null}

          {status === "ready" && !statusMessage ? (
            <p className="mt-2 text-xs text-subtle">
              Upload-ready · PDF validated on this device
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onReplace}
          disabled={uploading}
          className={cn(
            "inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted",
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
            "inline-flex h-9 items-center justify-center rounded-md px-3 text-xs font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground",
            uploading && "cursor-not-allowed opacity-50",
          )}
        >
          Remove
        </button>
      </div>
    </div>
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
