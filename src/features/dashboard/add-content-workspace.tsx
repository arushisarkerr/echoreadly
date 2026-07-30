"use client";

import Link from "next/link";

import { ROUTES, readerPathForStorage } from "@/constants";
import { WorkspaceCanvas } from "@/features/dashboard/workspace-canvas";
import { useLibrary } from "@/features/library";
import { UploadCard } from "@/features/upload";

/**
 * Import — drop a supported file.
 */
export function AddContentWorkspace() {
  const { items } = useLibrary();

  return (
    <WorkspaceCanvas
      kicker="Import"
      title="Drop a file to import."
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

        <div>
          <p className="mb-3 text-xs font-semibold tracking-wide text-subtle uppercase">
            Drop a file
          </p>
          <UploadCard />
        </div>
      </div>
    </WorkspaceCanvas>
  );
}
