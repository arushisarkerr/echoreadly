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
      className="rounded-[1.25rem] border border-danger/30 bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-4 py-4"
    >
      <p className="font-display text-base font-semibold text-foreground">
        Summary unavailable
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex h-10 min-h-10 items-center justify-center rounded-full bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
