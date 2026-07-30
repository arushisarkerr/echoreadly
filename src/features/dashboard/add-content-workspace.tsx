"use client";

import Link from "next/link";

import { ROUTES, readerPathForStorage } from "@/constants";
import { WorkspaceCanvas } from "@/features/dashboard/workspace-canvas";
import { useLibrary } from "@/features/library";
import { UploadCard } from "@/features/upload";

/**
 * Import — drop a file (or paste a link when available).
 */
export function AddContentWorkspace() {
  const { items } = useLibrary();

  return (
    <WorkspaceCanvas
      kicker="Import"
      title="Drop any file. Paste any link."
      description="EchoReadly prepares natural AI audio automatically. When it’s ready, you listen — no tools to operate."
      actionHref={ROUTES.library}
      actionLabel="Open Library"
    >
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <aside className="rounded-[2rem] border border-border/70 bg-foreground p-6 text-background sm:p-8">
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-background/55 uppercase">
            Journey
          </p>
          <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight">
            Import → Listen
          </h2>
          <ol className="mt-7 list-none space-y-5 p-0 text-sm text-background/80">
            <li className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-background/15 text-xs font-bold text-background"
              >
                1
              </span>
              <div>
                <p className="font-semibold text-background">Import</p>
                <p className="mt-1">Drop a PDF, DOCX, TXT, or Markdown file.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-background/15 text-xs font-bold text-background"
              >
                2
              </span>
              <div>
                <p className="font-semibold text-background">Preparing</p>
                <p className="mt-1">
                  Status appears on your item in Library — nothing to manage.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-background/15 text-xs font-bold text-background"
              >
                3
              </span>
              <div>
                <p className="font-semibold text-background">Listen</p>
                <p className="mt-1">Open it and play natural AI audio.</p>
              </div>
            </li>
          </ol>
          {items[0] ? (
            <p className="mt-8 border-t border-background/15 pt-5 text-sm text-background/70">
              Latest:{" "}
              <Link
                href={readerPathForStorage(items[0].storagePath)}
                className="font-semibold text-background underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/40"
              >
                {items[0].name}
              </Link>
            </p>
          ) : null}
        </aside>

        <div className="space-y-5">
          <div className="rounded-[1.75rem] border border-dashed border-border/80 bg-surface/40 px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <label
                  htmlFor="import-link"
                  className="text-xs font-semibold tracking-wide text-subtle uppercase"
                >
                  Paste a link
                </label>
                <p className="mt-1 text-sm text-muted">
                  Websites, blogs, and YouTube — not available yet.
                </p>
              </div>
              <span className="inline-flex rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-[0.65rem] font-semibold tracking-wide text-muted uppercase">
                Coming soon
              </span>
            </div>
            <input
              id="import-link"
              type="url"
              disabled
              placeholder="https://…"
              aria-describedby="import-link-help"
              className="mt-3 h-11 w-full rounded-full border border-border/80 bg-background/50 px-4 text-sm text-muted outline-none disabled:cursor-not-allowed"
            />
            <p id="import-link-help" className="mt-2 text-xs text-subtle">
              File import is live below. Link import will land here when ready.
            </p>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold tracking-wide text-subtle uppercase">
              Drop a file
            </p>
            <UploadCard />
          </div>
        </div>
      </div>
    </WorkspaceCanvas>
  );
}
