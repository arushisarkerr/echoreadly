"use client";

import { LibraryEmptyState } from "./empty-state";
import { LibraryGrid } from "./library-grid";
import { LibraryLoading } from "./loading";
import { useLibrary } from "./use-library";

/**
 * Client library page body: loading, empty, error, and grid states.
 */
export function LibraryPage() {
  const { items, loading, error } = useLibrary();

  return (
    <section
      aria-labelledby="library-heading"
      className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-12"
    >
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            id="library-heading"
            className="text-3xl font-semibold tracking-tight text-foreground"
          >
            Library
          </h1>
          <p className="mt-2 text-sm text-muted sm:text-base">
            PDFs stored in your EchoReadly workspace.
          </p>
        </div>
        {!loading && items.length > 0 ? (
          <p className="text-sm text-subtle">
            {items.length} {items.length === 1 ? "file" : "files"}
          </p>
        ) : null}
      </header>

      {loading ? <LibraryLoading /> : null}

      {!loading && error ? (
        <div
          role="alert"
          className="rounded-lg border border-danger/40 bg-surface px-4 py-3 text-sm text-danger"
        >
          {error}
        </div>
      ) : null}

      {!loading && !error && items.length === 0 ? <LibraryEmptyState /> : null}

      {!loading && !error && items.length > 0 ? (
        <LibraryGrid items={items} />
      ) : null}
    </section>
  );
}
