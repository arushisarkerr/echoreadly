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
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-border/70 bg-foreground p-6 text-background sm:p-8">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            How it works
          </h2>
          <ol className="mt-6 list-none space-y-4 p-0 text-sm text-background/80">
            <li>
              <span className="font-semibold text-background">1. Import</span>
              <p className="mt-1">Drop a PDF, DOCX, TXT, or Markdown file.</p>
            </li>
            <li>
              <span className="font-semibold text-background">2. Preparing</span>
              <p className="mt-1">
                Status appears on your item in Library — nothing to manage.
              </p>
            </li>
            <li>
              <span className="font-semibold text-background">3. Listen</span>
              <p className="mt-1">Open it and play natural AI audio.</p>
            </li>
          </ol>
          <p className="mt-8 text-xs text-background/55">
            Link import (websites, YouTube) is coming soon — file import is live.
          </p>
          {items[0] ? (
            <p className="mt-4 text-sm text-background/70">
              Latest:{" "}
              <Link
                href={readerPathForStorage(items[0].storagePath)}
                className="font-semibold text-background underline-offset-2 hover:underline"
              >
                {items[0].name}
              </Link>
            </p>
          ) : null}
        </div>

        <div className="space-y-4 rounded-[2rem] border border-border/70 bg-surface/50 p-5 sm:p-7">
          <div>
            <label
              htmlFor="import-link"
              className="text-xs font-semibold tracking-wide text-subtle uppercase"
            >
              Paste a link
            </label>
            <input
              id="import-link"
              type="url"
              disabled
              placeholder="https://… (coming soon)"
              className="mt-2 h-11 w-full rounded-full border border-border/80 bg-background/60 px-4 text-sm text-muted outline-none disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold tracking-wide text-subtle uppercase">
              Or drop a file
            </p>
            <UploadCard />
          </div>
        </div>
      </div>
    </WorkspaceCanvas>
  );
}
