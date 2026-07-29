/**
 * Skeleton placeholders shown while the library loads from Storage.
 */
export function LibraryLoading() {
  return (
    <ul
      aria-hidden="true"
      className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <li
          key={index}
          className="rounded-lg border border-border bg-surface p-5"
        >
          <div className="flex items-start gap-3">
            <div className="size-10 animate-pulse rounded-md bg-surface-muted" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-surface-muted" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-surface-muted" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-surface-muted" />
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <div className="h-9 w-20 animate-pulse rounded-md bg-surface-muted" />
            <div className="h-9 w-20 animate-pulse rounded-md bg-surface-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}
