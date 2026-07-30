"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";

import { ROUTES, readerPathForStorage } from "@/constants";
import {
  listCollectionStoragePaths,
  listCollections,
  toCollectionStoragePath,
  type CollectionSummary,
} from "@/features/collections";
import {
  formatLastOpened,
  progressForStoragePath,
  useListeningProgressMap,
  type LibraryProgressView,
} from "@/features/progress";
import type { StoredPdfObject } from "@/lib/storage";
import { cn, formatFileSize } from "@/utils";

import { LibraryEmptyState } from "./empty-state";
import { DeleteDocumentButton } from "./delete-document-button";
import { LibraryLoading } from "./loading";
import { useLibrary } from "./use-library";

type ViewMode = "grid" | "list" | "compact";
type SortMode = "newest" | "oldest" | "name";

/**
 * Editorial library shelf — paginated useLibrary / listPdfsPage data.
 * Presentation and client filter UX only; Storage fetches one page at a time.
 */
export function LibraryPage() {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortMode>("newest");
  const [source, setSource] = useState("all");
  const [language, setLanguage] = useState("all");
  const [status, setStatus] = useState("all");
  const [collection, setCollection] = useState("all");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [collectionOptions, setCollectionOptions] = useState<
    CollectionSummary[]
  >([]);
  const [membershipFilter, setMembershipFilter] = useState<{
    collectionId: string;
    paths: Set<string>;
  } | null>(null);

  const {
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    loadedCount,
    refresh,
    loadMore,
    removeItem,
  } = useLibrary({ sort });

  useEffect(() => {
    let cancelled = false;
    void listCollections().then((result) => {
      if (cancelled || !result.ok) {
        return;
      }
      setCollectionOptions(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [statusMessage]);

  useEffect(() => {
    if (collection === "all") {
      return;
    }

    let cancelled = false;

    void listCollectionStoragePaths(collection).then((result) => {
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setMembershipFilter({ collectionId: collection, paths: new Set() });
        return;
      }
      setMembershipFilter({
        collectionId: collection,
        paths: new Set(
          result.data.map((path) => toCollectionStoragePath(path)),
        ),
      });
    });

    return () => {
      cancelled = true;
    };
  }, [collection]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const activePaths =
      collection !== "all" && membershipFilter?.collectionId === collection
        ? membershipFilter.paths
        : null;

    return items.filter((item) => {
      if (source !== "all" && source !== "pdf") {
        return false;
      }

      if (collection !== "all") {
        if (!activePaths) {
          return false;
        }
        if (!activePaths.has(toCollectionStoragePath(item.storagePath))) {
          return false;
        }
      }

      if (!q) {
        return true;
      }
      return item.name.toLowerCase().includes(q);
    });
  }, [items, query, source, collection, membershipFilter]);

  const hasQuery = query.trim().length > 0;
  const previewFiltersActive = language !== "all" || status !== "all";

  function clearSearch() {
    setQuery("");
  }

  function handleDeleted(storagePath: string) {
    removeItem(storagePath);
    setStatusMessage("Document deleted.");
    void refresh();
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && query) {
      event.preventDefault();
      clearSearch();
    }
  }

  function handleLoadMore() {
    if (loadingMore || !hasMore) {
      return;
    }
    void loadMore();
  }

  return (
    <section className="mx-auto w-full max-w-[96rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-accent uppercase">
            Library
          </p>
          <h1 className="font-display mt-2 text-[clamp(2.2rem,3vw,3.5rem)] font-bold tracking-[-0.045em] text-foreground">
            The shelf
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted">
            Search, sort, and switch density. PDF inventory is live from your
            storage.
          </p>
        </div>
        <Link
          href={ROUTES.addContent}
          className="inline-flex h-11 min-h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Add content
        </Link>
      </div>

      <div className="mt-8 space-y-3 rounded-[1.75rem] border border-border/70 bg-surface/45 p-3 sm:p-4">
        <div className="relative">
          <label htmlFor="library-search" className="sr-only">
            Search library by name
          </label>
          <input
            id="library-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Search by name…"
            autoComplete="off"
            enterKeyHint="search"
            className="h-11 w-full rounded-full border border-border bg-background py-2 pr-20 pl-4 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {hasQuery ? (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute top-1/2 right-2 inline-flex h-8 -translate-y-1/2 items-center rounded-full px-3 text-xs font-semibold text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Clear
            </button>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              label="Source"
              value={source}
              onChange={setSource}
              options={[
                ["all", "All sources"],
                ["pdf", "PDF"],
                ["doc", "DOC (soon)"],
                ["url", "URL (soon)"],
              ]}
            />
            <FilterSelect
              label="Language"
              value={language}
              onChange={setLanguage}
              options={[
                ["all", "All languages"],
                ["en", "English"],
                ["bn", "Bangla"],
                ["hi", "Hindi"],
                ["pt", "Portuguese"],
              ]}
            />
            <FilterSelect
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                ["all", "Any status"],
                ["ready", "Ready"],
                ["processing", "Processing"],
              ]}
            />
            <FilterSelect
              label="Collections"
              value={collection}
              onChange={setCollection}
              options={[
                ["all", "All collections"],
                ...collectionOptions.map(
                  (entry) => [entry.id, entry.name] as [string, string],
                ),
              ]}
            />
            <FilterSelect
              label="Duration"
              value="all"
              onChange={() => undefined}
              disabled
              options={[["all", "Any duration"]]}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              label="Sort"
              value={sort}
              onChange={(v) => setSort(v as SortMode)}
              options={[
                ["newest", "Newest"],
                ["oldest", "Oldest"],
                ["name", "Name"],
              ]}
            />
            <div
              className="flex rounded-full border border-border p-1"
              role="group"
              aria-label="View mode"
            >
              {(["grid", "list", "compact"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={view === mode}
                  onClick={() => setView(mode)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[0.7rem] font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    view === mode
                      ? "bg-foreground text-background"
                      : "text-muted hover:text-foreground",
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {previewFiltersActive ? (
          <p className="text-[0.7rem] text-subtle">
            Language and status filters are preview-only until item metadata
            ships. Search, source, and collections still apply.
          </p>
        ) : null}
      </div>

      <div
        className="mt-4 flex flex-wrap items-center justify-between gap-2"
        aria-live="polite"
      >
        {!loading && !error && loadedCount > 0 ? (
          <p className="text-xs text-muted">
            {hasQuery || source !== "all"
              ? `${filtered.length} of ${loadedCount} loaded`
              : `${loadedCount} loaded${hasMore ? " · more available" : ""}`}
          </p>
        ) : (
          <span className="text-xs text-transparent">·</span>
        )}
        {statusMessage ? (
          <p role="status" className="text-xs font-medium text-foreground">
            {statusMessage}
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-4" role="status" aria-live="polite">
          <span className="sr-only">Loading library…</span>
          <LibraryLoading />
        </div>
      ) : null}

      {!loading && error && loadedCount === 0 ? (
        <div
          role="alert"
          className="mt-6 rounded-[1.5rem] border border-danger/35 bg-[color-mix(in_srgb,var(--danger)_7%,transparent)] px-5 py-6"
        >
          <p className="font-display text-lg font-semibold text-foreground">
            Couldn’t load the shelf
          </p>
          <p className="mt-2 text-sm text-danger">{error}</p>
          <button
            type="button"
            onClick={() => {
              void refresh();
            }}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-foreground px-4 text-xs font-semibold text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Try again
          </button>
        </div>
      ) : null}

      {!loading && !error && loadedCount === 0 ? (
        <div className="mt-6">
          <LibraryEmptyState />
        </div>
      ) : null}

      {!loading && loadedCount > 0 && filtered.length === 0 ? (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-border bg-surface/50 px-5 py-10 text-center">
          <p className="font-display text-xl font-semibold text-foreground">
            No matches
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            {hasQuery
              ? `Nothing matches “${query.trim()}”. Try another name or clear the search.`
              : "No items for this source filter. Switch back to PDF or All sources."}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {hasQuery ? (
              <button
                type="button"
                onClick={clearSearch}
                className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-4 text-xs font-semibold text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Clear search
              </button>
            ) : null}
            {source !== "all" ? (
              <button
                type="button"
                onClick={() => setSource("all")}
                className="inline-flex h-10 items-center justify-center rounded-full border border-border px-4 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Reset source
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {!loading && filtered.length > 0 ? (
        <>
          <LibraryViews
            items={filtered}
            view={view}
            onDeleted={handleDeleted}
          />

          {error ? (
            <p role="alert" className="mt-4 text-center text-sm text-danger">
              {error}
            </p>
          ) : null}

          {loadingMore ? (
            <div className="mt-4" role="status" aria-live="polite">
              <span className="sr-only">Loading more documents…</span>
              <LibraryLoading count={3} />
            </div>
          ) : null}

          {hasMore ? (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex h-11 min-h-11 items-center justify-center rounded-full border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function LibraryViews({
  items,
  view,
  onDeleted,
}: {
  items: StoredPdfObject[];
  view: ViewMode;
  onDeleted: (storagePath: string) => void;
}) {
  const { byStoragePath } = useListeningProgressMap();

  if (view === "list") {
    return (
      <ul className="mt-2 list-none divide-y divide-border/80 border-y border-border/80 p-0">
        {items.map((item) => {
          const progress = progressForStoragePath(
            byStoragePath,
            item.storagePath,
          );
          return (
          <li
            key={item.path}
            className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-1"
          >
            <Link
              href={readerPathForStorage(item.storagePath)}
              className="group flex min-w-0 flex-1 items-center gap-3 no-underline transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-muted text-[0.65rem] font-bold text-foreground"
              >
                PDF
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-foreground">
                  {item.name}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {progressMeta(progress, item)}
                </span>
              </span>
              <span className="hidden shrink-0 rounded-full bg-foreground px-3.5 py-2 text-xs font-semibold text-background opacity-90 transition group-hover:opacity-100 sm:inline-flex">
                {progress ? "Resume" : "Start Reading"}
              </span>
            </Link>
            <DeleteDocumentButton
              storagePath={item.storagePath}
              fileName={item.name}
              onDeleted={onDeleted}
            />
          </li>
          );
        })}
      </ul>
    );
  }

  if (view === "compact") {
    return (
      <ul className="mt-2 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const progress = progressForStoragePath(
            byStoragePath,
            item.storagePath,
          );
          return (
          <li
            key={item.path}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-border/70 bg-surface/50 px-3 py-2"
          >
            <Link
              href={readerPathForStorage(item.storagePath)}
              title={item.name}
              className="min-w-0 flex-1 truncate text-sm font-medium text-foreground no-underline hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.name}
            </Link>
            <span className="shrink-0 text-[0.7rem] tabular-nums text-subtle">
              {progress?.progressPercent != null
                ? `${progress.progressPercent}%`
                : formatFileSize(item.size)}
            </span>
            <DeleteDocumentButton
              storagePath={item.storagePath}
              fileName={item.name}
              onDeleted={onDeleted}
              className="shrink-0 [&_button]:h-8 [&_button]:min-h-8 [&_button]:px-3"
            />
          </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="mt-2 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const progress = progressForStoragePath(
          byStoragePath,
          item.storagePath,
        );
        return (
        <li key={item.path}>
          <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-border/70 bg-surface/50 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-[var(--elevation-sm)]">
            <div
              aria-hidden="true"
              className="relative h-28 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_srgb,var(--accent)_28%,transparent),transparent_55%),linear-gradient(135deg,var(--surface-muted),var(--background))]"
            >
              <div className="absolute inset-x-5 bottom-4 flex h-10 items-end gap-1 opacity-80">
                {[30, 55, 40, 70, 45, 60, 35].map((h, i) => (
                  <span
                    key={i}
                    className="w-full rounded-full bg-accent/70"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h3
                className="truncate font-display text-lg font-semibold tracking-tight text-foreground"
                title={item.name}
              >
                {item.name}
              </h3>
              <p className="mt-2 text-sm text-muted">
                {progressMeta(progress, item)}
              </p>
              <p className="mt-1 truncate text-[0.65rem] text-subtle">
                {progress
                  ? `Last opened ${formatLastOpened(progress.lastOpenedAt)}`
                  : "PDF"}
              </p>
              <div className="mt-auto flex flex-wrap items-start gap-2 pt-5">
                <Link
                  href={readerPathForStorage(item.storagePath)}
                  className="inline-flex h-10 min-h-10 flex-1 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {progress ? "Resume" : "Start Reading"}
                </Link>
                <DeleteDocumentButton
                  storagePath={item.storagePath}
                  fileName={item.name}
                  onDeleted={onDeleted}
                />
              </div>
            </div>
          </article>
        </li>
        );
      })}
    </ul>
  );
}

function progressMeta(
  progress: LibraryProgressView | null,
  item: StoredPdfObject,
): string {
  if (!progress) {
    return [
      formatFileSize(item.size),
      item.createdAt ? formatUploadDate(item.createdAt) : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  return [
    `Page ${progress.pageNumber}${
      progress.pageCount ? ` of ${progress.pageCount}` : ""
    }`,
    progress.progressPercent != null ? `${progress.progressPercent}%` : null,
    formatFileSize(item.size),
  ]
    .filter(Boolean)
    .join(" · ");
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  disabled?: boolean;
}) {
  const id = `library-filter-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <label className="flex items-center gap-2 text-[0.7rem] text-muted">
      <span className="sr-only">{label}</span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 max-w-[11rem] rounded-full border border-border bg-background px-3 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-55"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatUploadDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
