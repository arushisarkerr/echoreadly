import Link from "next/link";

import { ROUTES } from "@/constants";

/**
 * Empty library — Import is the only next step.
 */
export function LibraryEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border/80 bg-surface/60 px-6 py-16 text-center sm:py-20">
      <div
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-2xl bg-foreground font-display text-xs font-bold text-background shadow-[var(--elevation-sm)]"
      >
        ▶
      </div>

      <h2 className="font-display mt-5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        What should you listen to next?
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
        Drop a file to import. EchoReadly prepares natural AI audio automatically
        — then you listen.
      </p>

      <Link
        href={ROUTES.addContent}
        className="mt-6 inline-flex h-11 min-h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Import
      </Link>
    </div>
  );
}
