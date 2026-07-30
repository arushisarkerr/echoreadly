import Link from "next/link";

import { ROUTES } from "@/constants";

type ReaderErrorProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  onBackHref?: string;
};

/**
 * Reader error panel with optional retry and back actions.
 */
export function ReaderError({
  title = "Unable to open PDF",
  message,
  onRetry,
  onBackHref = ROUTES.library,
}: ReaderErrorProps) {
  return (
    <div
      role="alert"
      className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 py-16 text-center"
    >
      <div
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-2xl border border-danger/30 bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] font-display text-xs font-bold text-danger"
      >
        PDF
      </div>
      <h2 className="font-display mt-5 text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">{message}</p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-11 min-h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Try again
          </button>
        ) : null}
        <Link
          href={onBackHref}
          className="inline-flex h-11 min-h-11 items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Back to shelf
        </Link>
      </div>
    </div>
  );
}
