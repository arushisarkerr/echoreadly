"use client";

import Link from "next/link";

import { ROUTES, readerPathForStorage } from "@/constants";
import {
  formatLastOpened,
  progressForStoragePath,
  useListeningProgressMap,
} from "@/features/progress";
import type { StoredPdfObject } from "@/lib/storage";
import { formatFileSize } from "@/utils";

const PREPARING_WINDOW_MS = 10 * 60 * 1000;

function audioStatus(
  item: StoredPdfObject,
  hasProgress: boolean,
): "Preparing..." | "Ready" {
  if (hasProgress) {
    return "Ready";
  }
  if (item.createdAt) {
    const created = new Date(item.createdAt).getTime();
    if (
      Number.isFinite(created) &&
      Date.now() - created < PREPARING_WINDOW_MS
    ) {
      return "Preparing...";
    }
  }
  return "Ready";
}

/**
 * Library-as-home hub — Continue, Recent, Preparing statuses, secondary links.
 */
export function LibraryHomeHub({ items }: { items: StoredPdfObject[] }) {
  const { byStoragePath, recent: progressRecent } = useListeningProgressMap();

  const continueItem = (() => {
    for (const progress of progressRecent) {
      const item = items.find((entry) => {
        const hit = progressForStoragePath(byStoragePath, entry.storagePath);
        return hit != null && hit.lastOpenedAt === progress.lastOpenedAt;
      });
      if (item) {
        return {
          item,
          progress: progressForStoragePath(byStoragePath, item.storagePath),
        };
      }
    }
    return null;
  })();

  const recent = items.slice(0, 6);
  const preparing = items.filter((item) => {
    const progress = progressForStoragePath(byStoragePath, item.storagePath);
    return audioStatus(item, Boolean(progress)) === "Preparing...";
  });

  return (
    <div className="space-y-8">
      {continueItem ? (
        <section aria-labelledby="continue-listening-heading">
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-accent uppercase">
            Continue listening
          </p>
          <h2
            id="continue-listening-heading"
            className="font-display mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Pick up where you left off
          </h2>
          <Link
            href={readerPathForStorage(continueItem.item.storagePath)}
            className="mt-4 flex flex-col gap-3 rounded-[1.75rem] border border-border/70 bg-foreground p-5 text-background no-underline transition-opacity hover:opacity-95 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-semibold">
                {continueItem.item.name}
              </p>
              <p className="mt-1 text-sm text-background/70">
                {continueItem.progress
                  ? `Page ${continueItem.progress.pageNumber}${
                      continueItem.progress.pageCount
                        ? ` of ${continueItem.progress.pageCount}`
                        : ""
                    } · ${formatLastOpened(continueItem.progress.lastOpenedAt)}`
                  : "Ready to listen"}
              </p>
            </div>
            <span className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-background px-5 text-sm font-semibold text-foreground">
              Listen
            </span>
          </Link>
        </section>
      ) : null}

      {preparing.length > 0 ? (
        <section aria-labelledby="preparing-heading">
          <h2
            id="preparing-heading"
            className="text-[0.65rem] font-semibold tracking-[0.2em] text-subtle uppercase"
          >
            Preparing
          </h2>
          <ul className="mt-3 list-none space-y-2 p-0">
            {preparing.map((item) => (
              <li
                key={item.path}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-surface/50 px-4 py-3"
              >
                <span className="min-w-0 truncate text-sm font-medium text-foreground">
                  {item.name}
                </span>
                <span className="shrink-0 text-xs font-semibold text-muted">
                  Preparing...
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {recent.length > 0 ? (
        <section aria-labelledby="recent-heading">
          <h2
            id="recent-heading"
            className="text-[0.65rem] font-semibold tracking-[0.2em] text-subtle uppercase"
          >
            Recent
          </h2>
          <ul className="mt-3 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((item) => {
              const progress = progressForStoragePath(
                byStoragePath,
                item.storagePath,
              );
              const status = audioStatus(item, Boolean(progress));
              return (
                <li key={item.path}>
                  <Link
                    href={readerPathForStorage(item.storagePath)}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-surface/40 px-4 py-3 no-underline transition-colors hover:bg-surface-muted"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {item.name}
                      </span>
                      <span className="mt-0.5 block text-[0.7rem] text-muted">
                        {status}
                        {progress?.progressPercent != null
                          ? ` · ${progress.progressPercent}%`
                          : ` · ${formatFileSize(item.size)}`}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-foreground">
                      Listen
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section
        aria-label="More in library"
        className="flex flex-wrap gap-2 border-t border-border/50 pt-6"
      >
        <SecondaryLink href={ROUTES.exports} label="Downloads" />
        <SecondaryLink href={ROUTES.collections} label="Collections" />
        <SecondaryLink href={ROUTES.voices} label="Voice" />
        <SecondaryLink href={ROUTES.settings} label="Account" />
      </section>
    </div>
  );
}

function SecondaryLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center rounded-full border border-border/70 bg-background/50 px-3.5 text-xs font-semibold text-muted no-underline transition-colors hover:border-foreground/20 hover:text-foreground"
    >
      {label}
    </Link>
  );
}
