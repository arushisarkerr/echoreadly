type SummaryErrorProps = {
  message: string;
  onRetry?: () => void;
};

/**
 * Summary generation error state.
 */
export function SummaryError({ message, onRetry }: SummaryErrorProps) {
  return (
    <div
      role="alert"
      className="rounded-md border border-danger/20 bg-danger/5 px-4 py-3"
    >
      <p className="text-sm font-medium text-foreground">
        Summary unavailable
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex h-9 items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
