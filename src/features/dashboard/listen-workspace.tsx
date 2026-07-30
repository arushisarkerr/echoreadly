"use client";

import Link from "next/link";

import { ROUTES, readerPathForStorage } from "@/constants";
import { WorkspaceCanvas } from "@/features/dashboard/workspace-canvas";
import {
  formatLastOpened,
  progressForStoragePath,
  useListeningProgressMap,
} from "@/features/progress";
import { useLibrary } from "@/features/library";
import { formatFileSize } from "@/utils";

/**
 * Listen gallery — library items as playable studio entries.
 */
export function ListenWorkspace() {
  const { items, loading, error } = useLibrary();
  const { byStoragePath } = useListeningProgressMap();

  return (
    <WorkspaceCanvas
      kicker="Listen"
      title="Press play on a PDF."
      description="Each tile opens the existing Listening Studio — reader, summary, chat, and TTS intact."
      actionHref={ROUTES.library}
      actionLabel="Browse shelf"
    >
      {loading ? <p className="text-sm text-muted">Loading…</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-border p-10 text-sm text-muted">
          Nothing to hear yet.{" "}
          <Link href={ROUTES.addContent} className="font-semibold text-foreground">
            Add content
          </Link>
          .
        </div>
      ) : null}

      <ul className="grid list-none grid-cols-1 gap-4 p-0 lg:grid-cols-2">
        {items.map((item, index) => {
          const progress = progressForStoragePath(
            byStoragePath,
            item.storagePath,
          );
          return (
            <li key={item.path}>
              <Link
                href={readerPathForStorage(item.storagePath)}
                className="group relative flex min-h-[9rem] overflow-hidden rounded-[1.75rem] border border-border/70 bg-surface/40 no-underline"
              >
                <div className="flex w-[5.5rem] items-end justify-center gap-0.5 bg-foreground px-3 py-4 sm:w-28">
                  {[35, 60, 42, 78, 50, 68].map((h, i) => (
                    <span
                      key={i}
                      className="er-wave-bar w-1.5 rounded-full bg-background/85"
                      style={{
                        height: `${h}%`,
                        animationDelay: `${(index + i) * 0.05}s`,
                      }}
                    />
                  ))}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center p-5">
                  <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-accent uppercase">
                    {progress ? "Resume" : "Start Reading"}
                  </p>
                  <h2 className="mt-2 truncate font-display text-xl font-semibold tracking-tight text-foreground">
                    {item.name}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {progress
                      ? [
                          `Page ${progress.pageNumber}${
                            progress.pageCount
                              ? ` of ${progress.pageCount}`
                              : ""
                          }`,
                          progress.progressPercent != null
                            ? `${progress.progressPercent}%`
                            : null,
                          `Last opened ${formatLastOpened(progress.lastOpenedAt)}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : `${formatFileSize(item.size)} · Open studio`}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </WorkspaceCanvas>
  );
}
