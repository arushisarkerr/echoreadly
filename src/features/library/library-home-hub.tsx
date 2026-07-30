"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ROUTES, readerPathForStorage } from "@/constants";
import {
  formatLastOpened,
  progressForStoragePath,
  useListeningProgressMap,
} from "@/features/progress";
import type { StoredPdfObject } from "@/lib/storage";
import { cn, formatFileSize } from "@/utils";

const PREPARING_WINDOW_MS = 10 * 60 * 1000;

function audioStatus(
  item: StoredPdfObject,
  hasProgress: boolean,
  nowMs: number,
): "Preparing..." | "Ready" {
  if (hasProgress) {
    return "Ready";
  }
  if (item.createdAt) {
    const created = new Date(item.createdAt).getTime();
    if (
      Number.isFinite(created) &&
      nowMs - created < PREPARING_WINDOW_MS
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
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    const boot = window.setTimeout(() => {
      setNowMs(Date.now());
    }, 0);
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30_000);
    return () => {
      window.clearTimeout(boot);
      window.clearInterval(timer);
    };
  }, []);

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
  const preparing =
    nowMs == null
      ? []
      : items.filter((item) => {
          const progress = progressForStoragePath(
            byStoragePath,
            item.storagePath,
          );
          return audioStatus(item, Boolean(progress), nowMs) === "Preparing...";
        });

  return (
    <div className="space-y-10">
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
            className="mt-5 flex flex-col gap-4 rounded-[1.75rem] border border-border/70 bg-foreground p-5 text-background no-underline transition-[opacity,transform] duration-200 hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:flex-row sm:items-center sm:justify-between sm:p-6"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="ready-on-dark" label="In progress" />
                {continueItem.progress?.progressPercent != null ? (
                  <span className="text-[0.7rem] tabular-nums text-background/65">
                    {continueItem.progress.progressPercent}%
                  </span>
                ) : null}
              </div>
              <p className="mt-3 truncate font-display text-xl font-semibold sm:text-2xl">
                {continueItem.item.name}
              </p>
              <p
                className="mt-1.5 text-sm text-background/70"
                suppressHydrationWarning
              >
                {continueItem.progress
                  ? `Page ${continueItem.progress.pageNumber}${
                      continueItem.progress.pageCount
                        ? ` of ${continueItem.progress.pageCount}`
                        : ""
                    } · ${formatLastOpened(continueItem.progress.lastOpenedAt)}`
                  : "Ready to listen"}
              </p>
              {continueItem.progress?.progressPercent != null ? (
                <div
                  className="mt-4 h-1.5 overflow-hidden rounded-full bg-background/20"
                  aria-hidden="true"
                >
                  <div
                    className="h-full rounded-full bg-background/85"
                    style={{
                      width: `${Math.min(100, Math.max(0, continueItem.progress.progressPercent))}%`,
                    }}
                  />
                </div>
              ) : null}
            </div>
            <span className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-background px-6 text-sm font-semibold text-foreground">
              Listen
            </span>
          </Link>
        </section>
      ) : null}

      {preparing.length > 0 ? (
        <section aria-labelledby="preparing-heading">
          <div className="flex items-baseline justify-between gap-3">
            <h2
              id="preparing-heading"
              className="text-[0.65rem] font-semibold tracking-[0.2em] text-subtle uppercase"
            >
              Preparing
            </h2>
            <p className="text-[0.7rem] text-muted">
              Status only — nothing to manage
            </p>
          </div>
          <ul className="mt-3 list-none space-y-2 p-0">
            {preparing.map((item) => (
              <li
                key={item.path}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-surface/50 px-4 py-3.5"
              >
                <span className="min-w-0 truncate text-sm font-medium text-foreground">
                  {item.name}
                </span>
                <StatusBadge tone="preparing" label="Preparing" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {recent.length > 0 ? (
        <section aria-labelledby="recent-heading">
          <div className="flex items-baseline justify-between gap-3">
            <h2
              id="recent-heading"
              className="text-[0.65rem] font-semibold tracking-[0.2em] text-subtle uppercase"
            >
              Recent
            </h2>
            <p className="text-[0.7rem] text-muted">Jump back in</p>
          </div>
          <ul className="mt-3 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((item) => {
              const progress = progressForStoragePath(
                byStoragePath,
                item.storagePath,
              );
              const status =
                nowMs == null
                  ? "Ready"
                  : audioStatus(item, Boolean(progress), nowMs);
              return (
                <li key={item.path}>
                  <Link
                    href={readerPathForStorage(item.storagePath)}
                    className="flex h-full items-center justify-between gap-3 rounded-2xl border border-border/60 bg-surface/40 px-4 py-3.5 no-underline transition-colors hover:border-foreground/15 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {item.name}
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <StatusBadge
                          tone={
                            status === "Preparing..." ? "preparing" : "ready"
                          }
                          label={
                            status === "Preparing..." ? "Preparing" : "Ready"
                          }
                        />
                        <span className="text-[0.7rem] text-muted">
                          {progress?.progressPercent != null
                            ? `${progress.progressPercent}%`
                            : formatFileSize(item.size)}
                        </span>
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
        aria-labelledby="library-more-heading"
        className="border-t border-border/50 pt-7"
      >
        <h2
          id="library-more-heading"
          className="text-[0.65rem] font-semibold tracking-[0.2em] text-subtle uppercase"
        >
          More
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <SecondaryLink href={ROUTES.exports} label="Downloads" />
          <SecondaryLink href={ROUTES.collections} label="Collections" />
          <SecondaryLink href={ROUTES.voices} label="Voice" />
          <SecondaryLink href={ROUTES.settings} label="Account" />
        </div>
      </section>
    </div>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "preparing" | "ready" | "ready-on-dark";
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase",
        tone === "preparing" &&
          "border-accent/30 bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-foreground",
        tone === "ready" && "border-border bg-background text-muted",
        tone === "ready-on-dark" &&
          "border-background/25 bg-background/15 text-background",
      )}
    >
      {label}
    </span>
  );
}

function SecondaryLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center rounded-full border border-border/70 bg-background/50 px-3.5 text-xs font-semibold text-muted no-underline transition-colors hover:border-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {label}
    </Link>
  );
}
