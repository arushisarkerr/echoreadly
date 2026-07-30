import Link from "next/link";

import { ROUTES } from "@/constants";

/**
 * Empty library — Import is the only next step.
 */
export function LibraryEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border/80 bg-surface/60 px-6 py-16 text-center sm:px-10 sm:py-24">
      <div
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-2xl bg-foreground font-display text-xs font-bold text-background shadow-[var(--elevation-sm)]"
      >
        ▶
      </div>

      <p className="mt-6 text-[0.65rem] font-semibold tracking-[0.2em] text-accent uppercase">
        Library
      </p>
      <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        What should you listen to next?
      </h2>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
        Import a file. EchoReadly prepares natural AI audio automatically — then
        you listen.
      </p>

      <ol className="mt-6 flex list-none flex-wrap items-center justify-center gap-2 p-0 text-[0.7rem] font-semibold tracking-wide text-subtle uppercase">
        <li className="rounded-full border border-border/70 bg-background/60 px-3 py-1">
          Import
        </li>
        <li aria-hidden="true" className="text-border">
          →
        </li>
        <li className="rounded-full border border-border/70 bg-background/60 px-3 py-1">
          Preparing
        </li>
        <li aria-hidden="true" className="text-border">
          →
        </li>
        <li className="rounded-full border border-border/70 bg-background/60 px-3 py-1">
          Listen
        </li>
      </ol>

      <Link
        href={ROUTES.addContent}
        className="mt-8 inline-flex h-11 min-h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Import
      </Link>
    </div>
  );
}
