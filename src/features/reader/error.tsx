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
  onBackHref = "/dashboard/library",
}: ReaderErrorProps) {
  return (
    <div
      role="alert"
      className="mx-auto flex w-full max-w-lg flex-col items-center justify-center px-6 py-16 text-center"
    >
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">{message}</p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-10 items-center justify-center rounded-md bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Try again
          </button>
        ) : null}
        <a
          href={onBackHref}
          className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
        >
          Back to Library
        </a>
      </div>
    </div>
  );
}
