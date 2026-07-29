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
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <p className="text-xs font-medium text-muted">{message}</p>
      <div className="space-y-3">
        <div className="h-3 w-full animate-pulse rounded bg-surface-muted" />
        <div className="h-3 w-[92%] animate-pulse rounded bg-surface-muted" />
        <div className="h-3 w-[88%] animate-pulse rounded bg-surface-muted" />
        <div className="h-3 w-[70%] animate-pulse rounded bg-surface-muted" />
      </div>
    </div>
  );
}
