type SummaryLoadingProps = {
  message?: string;
};

/**
 * Skeleton placeholder while a summary is being generated.
 */
export function SummaryLoading({
  message = "Generating summary…",
}: SummaryLoadingProps) {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="text-xs font-semibold tracking-wide text-muted">{message}</p>
      <div className="space-y-3 rounded-[1.25rem] border border-border/70 bg-background/40 p-4">
        <div className="h-3 w-full animate-pulse rounded-full bg-surface-muted" />
        <div className="h-3 w-[92%] animate-pulse rounded-full bg-surface-muted" />
        <div className="h-3 w-[88%] animate-pulse rounded-full bg-surface-muted" />
        <div className="h-3 w-[70%] animate-pulse rounded-full bg-surface-muted" />
        <div className="mt-4 h-3 w-[80%] animate-pulse rounded-full bg-surface-muted" />
        <div className="h-3 w-[64%] animate-pulse rounded-full bg-surface-muted" />
      </div>
      <p className="text-[0.7rem] text-subtle">
        This can take a moment for longer documents.
      </p>
    </div>
  );
}
