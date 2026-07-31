/**
 * Toast surface placeholder — wire a real toast provider when backend events exist.
 */
export function ToastRegion() {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
    >
      <div className="pointer-events-auto hidden rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted shadow-[var(--elevation-md)]">
        Toast messages will appear here.
      </div>
    </div>
  );
}
