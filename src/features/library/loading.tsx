/**
 * Skeleton placeholders shown while the library loads from Storage.
 */
export function LibraryLoading({ count = 6 }: { count?: number }) {
  const safeCount = Math.min(12, Math.max(1, Math.floor(count)));

  return (
    <ul
      aria-hidden="true"
      className="grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: safeCount }).map((_, index) => (
        <li
          key={index}
          className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-surface/50"
        >
          <div className="h-28 animate-pulse bg-surface-muted" />
          <div className="space-y-3 p-5">
            <div className="h-4 w-3/4 animate-pulse rounded-full bg-surface-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded-full bg-surface-muted" />
            <div className="flex gap-2 pt-2">
              <div className="h-10 flex-1 animate-pulse rounded-full bg-surface-muted" />
              <div className="h-10 w-16 animate-pulse rounded-full bg-surface-muted" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
