"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ROUTES, readerPathForStorage } from "@/constants";
import type { StoredPdfObject } from "@/lib/storage";
import { formatFileSize } from "@/utils";

import { LibraryEmptyState } from "./empty-state";
import { LibraryLoading } from "./loading";
import { useLibrary } from "./use-library";

type ViewMode = "grid" | "list" | "compact";
type SortMode = "newest" | "oldest" | "name";

/**
 * Editorial library shelf — same useLibrary / listPdfs data.
 */
export function LibraryPage() {
  const { items, loading, error } = useLibrary();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortMode>("newest");
  const [source, setSource] = useState("all");
  const [language, setLanguage] = useState("all");
  const [status, setStatus] = useState("all");
  const [collection, setCollection] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let next = items.filter((item) => {
      if (source !== "all" && source !== "pdf") return false;
      if (language !== "all") return true;
      if (status !== "all") return true;
      if (collection !== "all") return true;
      if (!q) return true;
      return item.name.toLowerCase().includes(q);
    });

    next = [...next].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      return sort === "newest" ? bTime - aTime : aTime - bTime;
    });
    return next;
  }, [items, query, sort, source, language, status, collection]);

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
          className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background"
        >
          Add content
        </Link>
      </div>

      <div className="mt-8 space-y-3 rounded-[1.75rem] border border-border/70 bg-surface/45 p-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name…"
          aria-label="Search library"
          className="h-11 w-full rounded-full border border-border bg-background px-4 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select
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
          <Select
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
          <Select
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              ["all", "Any status"],
              ["ready", "Ready"],
              ["processing", "Processing"],
            ]}
          />
          <Select
            label="Date"
            value={sort}
            onChange={(v) => setSort(v as SortMode)}
            options={[
              ["newest", "Newest"],
              ["oldest", "Oldest"],
              ["name", "Name"],
            ]}
          />
          <Select
            label="Duration"
            value="all"
            onChange={() => undefined}
            options={[["all", "Any duration"]]}
          />
          <Select
            label="Collections"
            value={collection}
            onChange={setCollection}
            options={[
              ["all", "All collections"],
              ["pinned", "Pinned"],
              ["favorites", "Favorites"],
            ]}
          />
          <div
            className="ml-auto flex rounded-full border border-border p-1"
            role="group"
            aria-label="View mode"
          >
            {(["grid", "list", "compact"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={view === mode}
                onClick={() => setView(mode)}
                className={`rounded-full px-3 py-1.5 text-[0.7rem] font-semibold capitalize ${
                  view === mode
                    ? "bg-foreground text-background"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? <div className="mt-8"><LibraryLoading /></div> : null}
      {!loading && error ? (
        <p role="alert" className="mt-6 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <div className="mt-8">
          <LibraryEmptyState />
        </div>
      ) : null}
      {!loading && !error && items.length > 0 && filtered.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No matches.</p>
      ) : null}
      {!loading && filtered.length > 0 ? (
        <LibraryViews items={filtered} view={view} />
      ) : null}
    </section>
  );
}

function LibraryViews({
  items,
  view,
}: {
  items: StoredPdfObject[];
  view: ViewMode;
}) {
  if (view === "list") {
    return (
      <ul className="mt-8 list-none divide-y divide-border border-y border-border p-0">
        {items.map((item) => (
          <li key={item.path} className="flex items-center gap-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foreground">{item.name}</p>
              <p className="text-xs text-muted">{formatFileSize(item.size)}</p>
            </div>
            <Link
              href={readerPathForStorage(item.storagePath)}
              className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background"
            >
              Open
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  if (view === "compact") {
    return (
      <ul className="mt-8 columns-1 gap-3 p-0 sm:columns-2 xl:columns-3">
        {items.map((item) => (
          <li key={item.path} className="mb-3 break-inside-avoid list-none">
            <Link
              href={readerPathForStorage(item.storagePath)}
              className="flex items-center justify-between rounded-xl border border-border/70 bg-surface/50 px-3 py-2.5 text-sm no-underline hover:bg-surface-muted"
            >
              <span className="truncate font-medium text-foreground">
                {item.name}
              </span>
              <span className="ml-3 shrink-0 text-[0.7rem] text-subtle">
                {formatFileSize(item.size)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="mt-8 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <li key={item.path}>
          <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-border/70 bg-surface/50">
            <div className="relative h-28 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_srgb,var(--accent)_28%,transparent),transparent_55%),linear-gradient(135deg,var(--surface-muted),var(--background))]">
              <div className="absolute inset-x-5 bottom-4 flex h-10 items-end gap-1 opacity-80">
                {[30, 55, 40, 70, 45, 60, 35].map((h, i) => (
                  <span
                    key={i}
                    className="er-wave-bar flex-1 rounded-full bg-accent/70"
                    style={{ height: `${h}%`, animationDelay: `${i * 0.08}s` }}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h3 className="truncate font-display text-lg font-semibold tracking-tight text-foreground">
                {item.name}
              </h3>
              <p className="mt-2 text-sm text-muted">
                {formatFileSize(item.size)}
                {item.createdAt
                  ? ` · ${new Date(item.createdAt).toLocaleDateString()}`
                  : ""}
              </p>
              <div className="mt-auto flex gap-2 pt-5">
                <Link
                  href={readerPathForStorage(item.storagePath)}
                  className="inline-flex h-9 flex-1 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background"
                >
                  Open studio
                </Link>
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center rounded-full border border-border px-3 text-xs font-semibold text-muted"
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="flex items-center gap-2 text-[0.7rem] text-muted">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-full border border-border bg-background px-3 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
