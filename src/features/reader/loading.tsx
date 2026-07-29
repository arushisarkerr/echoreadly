/**
 * Reader loading placeholder while the signed URL or PDF document initializes.
 */
export function ReaderLoading({ message = "Loading PDF…" }: { message?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16"
    >
      <div className="h-10 w-48 animate-pulse rounded-md bg-surface-muted" />
      <div className="h-[28rem] w-full max-w-xl animate-pulse rounded-lg bg-surface-muted" />
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
