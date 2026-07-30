"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { ROUTES, readerPathForStorage } from "@/constants";
import { useAuth } from "@/features/auth";
import {
  formatLastOpened,
  progressForStoragePath,
  useListeningProgressMap,
} from "@/features/progress";
import { useLibrary } from "@/features/library";
import { UploadCard } from "@/features/upload";
import { formatFileSize } from "@/utils";

const VOICES = ["Female", "Male", "Bangla", "English", "Calm", "Podcast"] as const;

/**
 * Magazine-style home — content-first, asymmetric, wired to real library + upload.
 */
export function HomeWorkspace() {
  const { user } = useAuth();
  const { items, loading, error } = useLibrary();
  const { byStoragePath, recent: progressRecent } = useListeningProgressMap();
  const name =
    (typeof user?.user_metadata?.full_name === "string" &&
      user.user_metadata.full_name.trim()) ||
    user?.email?.split("@")[0] ||
    "Creator";

  const leadFromProgress = (() => {
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

  const lead = leadFromProgress
    ? leadFromProgress
    : items[0]
      ? {
          item: items[0],
          progress: progressForStoragePath(byStoragePath, items[0].storagePath),
        }
      : null;

  const recent = items.slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-[96rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="grid items-end gap-8 lg:grid-cols-[1.35fr_0.65fr]">
        <div>
          <p className="text-[0.65rem] font-semibold tracking-[0.24em] text-accent uppercase">
            Welcome back
          </p>
          <h1 className="font-display mt-3 max-w-[11ch] text-[clamp(2.6rem,4vw,4.6rem)] font-bold leading-[0.92] tracking-[-0.05em] text-foreground">
            {name}, the studio is live.
          </h1>
          <p className="mt-5 max-w-md text-[0.975rem] leading-relaxed text-muted">
            Continue a listen, import fresh source material, or open the shelf —
            all wired to your real library.
          </p>
        </div>

        <div className="er-glass relative overflow-hidden rounded-[2rem] p-5">
          <div className="absolute -top-10 -right-8 size-36 rounded-full bg-[color:var(--glow)] blur-3xl" />
          <p className="relative text-[0.65rem] font-semibold tracking-[0.18em] text-subtle uppercase">
            Signal
          </p>
          <div className="relative mt-6 flex h-20 items-end gap-1">
            {[22, 48, 34, 70, 40, 82, 36, 64, 28, 58, 44, 76, 32, 60].map(
              (h, i) => (
                <span
                  key={i}
                  className="er-wave-bar flex-1 rounded-full bg-[linear-gradient(to_top,var(--accent),color-mix(in_srgb,var(--accent-soft)_75%,transparent))]"
                  style={{ height: `${h}%`, animationDelay: `${i * 0.06}s` }}
                />
              ),
            )}
          </div>
        </div>
      </section>

      <section className="mt-12 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <Eyebrow>Continue listening</Eyebrow>
          {lead ? (
            <Link
              href={readerPathForStorage(lead.item.storagePath)}
              className="group relative block overflow-hidden rounded-[2rem] bg-foreground p-7 text-background no-underline shadow-[var(--elevation-md)]"
            >
              <div
                aria-hidden="true"
                className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_80%_30%,color-mix(in_srgb,var(--accent-soft)_45%,transparent),transparent_60%)]"
              />
              <p className="relative text-[0.65rem] font-semibold tracking-[0.2em] text-background/55 uppercase">
                {lead.progress ? "Resume" : "Start Reading"}
              </p>
              <h2 className="relative mt-4 max-w-[16ch] font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {lead.item.name}
              </h2>
              <p className="relative mt-3 text-sm text-background/65">
                {lead.progress
                  ? [
                      `Page ${lead.progress.pageNumber}${
                        lead.progress.pageCount
                          ? ` of ${lead.progress.pageCount}`
                          : ""
                      }`,
                      lead.progress.progressPercent != null
                        ? `${lead.progress.progressPercent}%`
                        : null,
                      `Last opened ${formatLastOpened(lead.progress.lastOpenedAt)}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : `${formatFileSize(lead.item.size)} · Open Listening Studio`}
              </p>
            </Link>
          ) : (
            <QuietBox>
              Nothing in progress yet. Import a PDF to begin.
            </QuietBox>
          )}

          <Eyebrow>Recent imports</Eyebrow>
          {loading ? <QuietBox>Loading your shelf…</QuietBox> : null}
          {error ? <QuietBox danger>{error}</QuietBox> : null}
          {!loading && !error && recent.length === 0 ? (
            <QuietBox>Your shelf is empty — drop a PDF on the right.</QuietBox>
          ) : null}
          {!loading && recent.length > 0 ? (
            <ul className="list-none space-y-2 p-0">
              {recent.map((item, index) => {
                const progress = progressForStoragePath(
                  byStoragePath,
                  item.storagePath,
                );
                return (
                <li key={item.path}>
                  <Link
                    href={readerPathForStorage(item.storagePath)}
                    className="flex items-center gap-4 rounded-[1.25rem] border border-border/70 bg-surface/55 px-4 py-3.5 no-underline transition-colors hover:border-foreground/20"
                  >
                    <span className="font-mono text-xs text-subtle">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-foreground">
                      {item.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {progress
                        ? progress.progressPercent != null
                          ? `${progress.progressPercent}% · Resume`
                          : `Page ${progress.pageNumber} · Resume`
                        : formatFileSize(item.size)}
                    </span>
                  </Link>
                </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        <div className="space-y-5">
          <Eyebrow>Quick PDF upload</Eyebrow>
          <div className="rounded-[2rem] border border-border/70 bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] p-5 shadow-[var(--elevation-sm)] sm:p-6">
            <UploadCard />
          </div>
        </div>
      </section>

      <section className="mt-14 grid gap-4 md:grid-cols-3">
        <StoryTile
          kicker="Audio"
          title="Listen"
          copy="Open a PDF in the studio to play page or summary audio."
          href={ROUTES.listen}
          cta="Open →"
        />
        <StoryTile
          kicker="Organize"
          title="Collections"
          copy="Group shelf documents into reusable rooms — create, rename, and manage membership."
          href={ROUTES.collections}
          cta="Open →"
        />
        <StoryTile
          kicker="Coming soon"
          title="Exports"
          copy="File export is not available yet. Preview planned MP3, M4A, and WAV downloads — listen online in the studio today."
          href={ROUTES.exports}
          cta="Preview →"
        />
      </section>

      <section className="mt-14 grid gap-10 border-t border-border/70 pt-10 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <Eyebrow>Voices · Coming soon</Eyebrow>
          <p className="mt-2 text-sm text-muted">
            Multi-voice personas are planned. Listening uses the default studio
            TTS voice today.
          </p>
          <ul className="mt-4 flex list-none flex-wrap gap-2 p-0">
            {VOICES.map((voice) => (
              <li key={voice}>
                <Link
                  href={ROUTES.voices}
                  className="inline-flex rounded-full border border-border bg-background/60 px-4 py-2 text-sm font-semibold text-muted no-underline hover:border-foreground/30"
                >
                  {voice} · Soon
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <Eyebrow>Recent activity</Eyebrow>
          <ol className="mt-4 list-none divide-y divide-border border-y border-border p-0">
            <li className="py-4 text-sm text-muted">
              Library synced · {items.length}{" "}
              {items.length === 1 ? "document" : "documents"}
            </li>
            <li className="py-4 text-sm text-muted">
              Listening studio ready — summary, chat, and page audio intact
            </li>
            <li className="py-4 text-sm text-muted">
              Theme toggle + command dock available across the workspace
            </li>
          </ol>
        </div>
      </section>
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
      {children}
    </h2>
  );
}

function QuietBox({
  children,
  danger,
}: {
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      role={danger ? "alert" : undefined}
      className={`rounded-[1.25rem] border border-dashed px-4 py-6 text-sm ${
        danger ? "border-danger/40 text-danger" : "border-border text-muted"
      }`}
    >
      {children}
    </div>
  );
}

function StoryTile({
  kicker,
  title,
  copy,
  href,
  cta = "Open →",
}: {
  kicker: string;
  title: string;
  copy: string;
  href: string;
  cta?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[11rem] flex-col rounded-[1.75rem] border border-border/70 bg-surface/40 p-5 no-underline transition-transform hover:-translate-y-0.5"
    >
      <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-accent uppercase">
        {kicker}
      </p>
      <h3 className="font-display mt-3 text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{copy}</p>
      <span className="mt-4 text-xs font-semibold text-foreground group-hover:underline">
        {cta}
      </span>
    </Link>
  );
}
