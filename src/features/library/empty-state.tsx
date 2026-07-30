import Link from "next/link";

import { ROUTES } from "@/constants";

/**
 * Empty library state with a path back to add content.
 */
export function LibraryEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border/80 bg-surface/60 px-6 py-16 text-center sm:py-20">
      <div
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-2xl bg-foreground font-display text-xs font-bold text-background shadow-[var(--elevation-sm)]"
      >
        PDF
      </div>

      <h2 className="font-display mt-5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Your shelf is waiting
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
        Import a PDF to start listening, summarizing, and chatting in the
        studio.
      </p>

      <Link
        href={ROUTES.addContent}
        className="mt-6 inline-flex h-11 min-h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Add content
      </Link>
    </div>
  );
}
