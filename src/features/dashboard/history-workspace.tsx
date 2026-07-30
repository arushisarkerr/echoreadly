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

/**
 * History spine — timeline of imports into the studio.
 */
export function HistoryWorkspace() {
  const { items, loading, error } = useLibrary();
  const { byStoragePath } = useListeningProgressMap();

  return (
    <WorkspaceCanvas
      kicker="History"
      title="Pick up the thread."
      description="A vertical spine of imports. Open any moment to continue in the Listening Studio."
      actionHref={ROUTES.listen}
      actionLabel="Continue listening"
    >
      {loading ? <p className="text-sm text-muted">Loading timeline…</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute top-0 bottom-0 left-[0.55rem] w-px bg-border sm:left-1/2 sm:-translate-x-px"
        />
        <ol className="list-none space-y-8 p-0">
          {items.map((item, index) => {
            const progress = progressForStoragePath(
              byStoragePath,
              item.storagePath,
            );
            return (
              <li
                key={item.path}
                className={`relative grid gap-3 sm:grid-cols-2 sm:gap-10 ${
                  index % 2 === 1 ? "sm:text-right" : ""
                }`}
              >
                <span
                  aria-hidden="true"
                  className="absolute top-2 left-0 size-2.5 rounded-full bg-accent sm:left-1/2 sm:-translate-x-1/2"
                />
                <div
                  className={`pl-8 sm:pl-0 ${
                    index % 2 === 1
                      ? "sm:col-start-2 sm:text-left"
                      : "sm:pr-10 sm:text-right"
                  }`}
                >
                  <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-subtle uppercase">
                    {progress
                      ? `Last opened ${formatLastOpened(progress.lastOpenedAt)}`
                      : item.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : "Imported"}
                  </p>
                  <Link
                    href={readerPathForStorage(item.storagePath)}
                    className="mt-2 block font-display text-2xl font-semibold tracking-tight text-foreground no-underline hover:underline"
                  >
                    {item.name}
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    {progress
                      ? [
                          "Resume",
                          `page ${progress.pageNumber}${
                            progress.pageCount
                              ? ` of ${progress.pageCount}`
                              : ""
                          }`,
                          progress.progressPercent != null
                            ? `${progress.progressPercent}%`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : "Start Reading →"}
                  </p>
                </div>
              </li>
            );
          })}
          {!loading && items.length === 0 ? (
            <li className="pl-8 text-sm text-muted sm:pl-0 sm:text-center">
              No history yet.
            </li>
          ) : null}
        </ol>
      </div>
    </WorkspaceCanvas>
  );
}
