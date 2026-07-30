"use client";

import { ROUTES } from "@/constants";
import { WorkspaceCanvas } from "@/features/dashboard/workspace-canvas";
import { formatFileSize } from "@/utils";

import { useExportsList } from "./use-exports-list";

/**
 * Exports workspace — list and re-download cached MP3 narration files.
 */
export function ExportsWorkspace() {
  const {
    items,
    loading,
    error,
    downloadingId,
    statusMessage,
    refresh,
    download,
  } = useExportsList();

  return (
    <WorkspaceCanvas
      kicker="Downloads"
      title="Take your audio with you."
      description="Download prepared MP3 files. Private to your account — open Library when you want to listen again."
      actionHref={ROUTES.library}
      actionLabel="Open Library"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Provider format:{" "}
          <span className="font-semibold text-foreground">MP3</span>
        </p>
        <button
          type="button"
          onClick={() => {
            void refresh();
          }}
          disabled={loading || Boolean(downloadingId)}
          className="inline-flex h-9 items-center justify-center rounded-full border border-border/80 bg-background/50 px-3.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {statusMessage ? (
        <p role="status" className="mt-4 text-sm text-muted">
          {statusMessage}
        </p>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="mt-6 rounded-[1.5rem] border border-danger/30 bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-4 py-4"
        >
          <p className="text-sm font-semibold text-danger">
            Couldn’t load exports
          </p>
          <p className="mt-1 text-sm text-muted">{error}</p>
          <button
            type="button"
            onClick={() => {
              void refresh();
            }}
            className="mt-3 inline-flex h-9 items-center rounded-full border border-border px-3.5 text-xs font-semibold text-foreground"
          >
            Try again
          </button>
        </div>
      ) : null}

      {loading && !error ? (
        <p className="mt-8 text-sm text-muted" role="status">
          Loading your exports…
        </p>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <div className="mt-8 rounded-[1.5rem] border border-dashed border-border/80 bg-surface/40 px-4 py-10 text-center">
          <p className="font-display text-base font-semibold text-foreground">
            No exports yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
            Open a document from Library and download audio when you listen.
          </p>
        </div>
      ) : null}

      {!loading && items.length > 0 ? (
        <ul className="mt-8 list-none space-y-3 p-0" aria-label="Audio exports">
          {items.map((item) => {
            const detail =
              item.source === "page"
                ? `Page ${item.pageNumber ?? "—"}`
                : `Summary · ${item.summaryType ?? "—"}`;
            const busy = downloadingId === item.exportId;

            return (
              <li
                key={item.exportId}
                className="flex flex-col gap-3 rounded-[1.5rem] border border-border/70 bg-surface/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {item.fileName}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {detail} · {item.voice} · {formatFileSize(item.byteSize)} ·
                    MP3
                  </p>
                  {item.originalFileName ? (
                    <p className="mt-0.5 truncate text-xs text-subtle">
                      {item.originalFileName}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void download(item);
                  }}
                  disabled={Boolean(downloadingId)}
                  aria-busy={busy || undefined}
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-foreground bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "Downloading…" : "Download"}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </WorkspaceCanvas>
  );
}
