/**
 * Reader loading placeholder while the signed URL or PDF document initializes.
 */
export function ReaderLoading({
  message = "Loading PDF…",
}: {
  message?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-16"
    >
      <div
        aria-hidden="true"
        className="w-full max-w-xl overflow-hidden rounded-[1.25rem] border border-border/70 bg-surface/60 shadow-[var(--elevation-sm)]"
      >
        <div className="h-8 animate-pulse bg-surface-muted" />
        <div className="space-y-3 p-6">
          <div className="mx-auto h-[22rem] w-full max-w-md animate-pulse rounded-lg bg-surface-muted sm:h-[28rem]" />
        </div>
      </div>
      <p className="text-sm font-medium text-muted">{message}</p>
    </div>
  );
}
