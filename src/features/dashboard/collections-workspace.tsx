import Link from "next/link";

import { ROUTES } from "@/constants";
import { WorkspaceCanvas } from "@/features/dashboard/workspace-canvas";
import { cn } from "@/utils";

/**
 * Static preview rooms — matches the existing Collections surface.
 * No persistence, create/rename/delete, or document membership yet.
 */
const FOLDERS = [
  { name: "Pinned", note: "Keep close", accent: true },
  { name: "Favorites", note: "Starred listens", accent: false },
  { name: "Recently played", note: "Last session", accent: false },
  { name: "Study", note: "Deep work", accent: false },
  { name: "Briefings", note: "Daily pulse", accent: false },
  { name: "Longform", note: "Deep reads", accent: false },
] as const;

/**
 * Collections mosaic — frontend-only visual folders.
 */
export function CollectionsWorkspace() {
  return (
    <WorkspaceCanvas
      kicker="Collections"
      title="Rooms for your listening."
      description="Visual collection rooms for your shelf. Membership and edits arrive with the next data layer — the layout below is the current preview."
      actionHref={ROUTES.library}
      actionLabel="Browse shelf"
    >
      <div
        role="status"
        className="rounded-[1.5rem] border border-dashed border-border/80 bg-surface/40 px-4 py-4 sm:px-5"
      >
        <p className="text-sm font-semibold text-foreground">
          Collections are in preview
        </p>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          Create, rename, delete, and document membership are not available yet.
          Every room below is empty until persistence ships. Your PDFs stay on
          the{" "}
          <Link
            href={ROUTES.library}
            className="font-semibold text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            library shelf
          </Link>
          .
        </p>
      </div>

      <ul
        className="mt-8 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3"
        aria-label="Collection rooms"
      >
        {FOLDERS.map((folder, i) => (
          <li key={folder.name}>
            <article
              aria-labelledby={`collection-${i}-title`}
              className={cn(
                "relative flex min-h-[12.5rem] flex-col justify-between overflow-hidden rounded-[1.85rem] border border-border/70 p-5 sm:p-6",
                folder.accent
                  ? "bg-foreground text-background"
                  : "bg-surface/55",
              )}
            >
              <div
                aria-hidden="true"
                className={cn(
                  "absolute -top-10 -right-8 size-32 rounded-full blur-3xl",
                  folder.accent
                    ? "bg-[color-mix(in_srgb,var(--accent-soft)_50%,transparent)]"
                    : "bg-[color:var(--glow)]",
                )}
                style={{ opacity: 0.7 - i * 0.05 }}
              />

              <div className="relative flex items-start justify-between gap-3">
                <p
                  className={cn(
                    "text-[0.65rem] font-semibold tracking-[0.18em] uppercase",
                    folder.accent ? "text-background/55" : "text-accent",
                  )}
                >
                  Collection
                </p>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase",
                    folder.accent
                      ? "border-background/25 text-background/65"
                      : "border-border text-subtle",
                  )}
                >
                  Empty
                </span>
              </div>

              <div className="relative mt-8">
                <h2
                  id={`collection-${i}-title`}
                  className="font-display text-2xl font-semibold tracking-tight"
                >
                  {folder.name}
                </h2>
                <p
                  className={cn(
                    "mt-2 text-sm leading-relaxed",
                    folder.accent ? "text-background/65" : "text-muted",
                  )}
                >
                  {folder.note}
                </p>
                <p
                  className={cn(
                    "mt-3 text-xs font-medium tabular-nums",
                    folder.accent ? "text-background/50" : "text-subtle",
                  )}
                >
                  0 documents
                </p>
              </div>

              <p className="sr-only">
                Preview only. No documents in this collection yet. Editing is
                unavailable.
              </p>
            </article>
          </li>
        ))}
      </ul>

      <div className="mt-8 rounded-[1.5rem] border border-border/70 bg-background/40 px-4 py-5 sm:px-5">
        <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
          Empty shelf rooms
        </h3>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          When collections persist, you will organize library documents into
          these rooms. Until then, open the shelf to listen, summarize, and
          chat.
        </p>
        <Link
          href={ROUTES.library}
          className="mt-4 inline-flex h-10 min-h-10 items-center justify-center rounded-full bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Open library
        </Link>
      </div>
    </WorkspaceCanvas>
  );
}
