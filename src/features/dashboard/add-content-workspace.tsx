"use client";

import Link from "next/link";

import { ROUTES, readerPathForStorage } from "@/constants";
import { WorkspaceCanvas } from "@/features/dashboard/workspace-canvas";
import { useLibrary } from "@/features/library";
import { UploadCard } from "@/features/upload";

const SOURCES = [
  { label: "PDF", live: true },
  { label: "DOC / DOCX", live: false },
  { label: "TXT", live: false },
  { label: "Markdown", live: false },
  { label: "EPUB", live: false },
  { label: "Website URL", live: false },
  { label: "Blog", live: false },
  { label: "News", live: false },
  { label: "Documentation", live: false },
  { label: "Audio File", live: false },
  { label: "Video File", live: false },
  { label: "YouTube URL", live: false },
] as const;

/**
 * Import bay — source constellation + existing PDF UploadCard.
 */
export function AddContentWorkspace() {
  const { items } = useLibrary();

  return (
    <WorkspaceCanvas
      kicker="Add content"
      title="Import into the studio."
      description="PDF upload is live. Other sources in the constellation are coming soon — not available for import yet."
      actionHref={ROUTES.library}
      actionLabel="Open shelf"
    >
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-foreground p-6 text-background sm:p-8">
          <div
            aria-hidden="true"
            className="absolute -top-16 -right-10 size-48 rounded-full bg-[color-mix(in_srgb,var(--accent-soft)_40%,transparent)] blur-3xl"
          />
          <h2 className="relative font-display text-2xl font-semibold tracking-tight">
            Sources
          </h2>
          <ul className="relative mt-6 flex list-none flex-wrap gap-2 p-0">
            {SOURCES.map((source) => (
              <li key={source.label}>
                <span
                  className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
                    source.live
                      ? "bg-background text-foreground"
                      : "border border-background/25 text-background/65"
                  }`}
                >
                  {source.label}
                  {source.live ? "" : " · soon"}
                </span>
              </li>
            ))}
          </ul>
          {items[0] ? (
            <p className="relative mt-8 text-sm text-background/70">
              Last import:{" "}
              <Link
                href={readerPathForStorage(items[0].storagePath)}
                className="font-semibold text-background underline-offset-2 hover:underline"
              >
                {items[0].name}
              </Link>
            </p>
          ) : null}
        </div>

        <div className="rounded-[2rem] border border-border/70 bg-surface/50 p-5 sm:p-7">
          <p className="mb-4 text-sm text-muted">
            Live PDF upload — validation, progress, and storage.
          </p>
          <UploadCard />
        </div>
      </div>
    </WorkspaceCanvas>
  );
}
