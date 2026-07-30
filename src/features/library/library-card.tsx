import Link from "next/link";

import { readerPathForStorage } from "@/constants";
import type { StoredPdfObject } from "@/lib/storage";
import { formatFileSize } from "@/utils";

type LibraryCardProps = {
  item: StoredPdfObject;
};

/**
 * Single library item card.
 * Open navigates to the reader; Delete remains a disabled UI placeholder.
 */
export function LibraryCard({ item }: LibraryCardProps) {
  const uploadedLabel = formatUploadDate(item.createdAt);
  const readerHref = readerPathForStorage(item.storagePath);

  return (
    <article className="group flex h-full flex-col rounded-[1.75rem] border border-border/70 bg-surface/50 p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-[var(--elevation-sm)]">
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-muted text-foreground"
        >
          <PdfGlyph className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h3
            className="truncate text-sm font-semibold tracking-tight text-foreground"
            title={item.name}
          >
            {item.name}
          </h3>
          <p className="mt-1 text-xs text-muted">
            <span className="tabular-nums">{formatFileSize(item.size)}</span>
            {uploadedLabel ? ` · ${uploadedLabel}` : null}
          </p>
          <p className="mt-2 truncate text-[0.6875rem] text-subtle">PDF</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={readerHref}
          className="inline-flex h-10 min-h-10 items-center justify-center rounded-full bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Open studio
        </Link>
        <button
          type="button"
          disabled
          title="Delete is coming soon"
          aria-label="Delete (coming soon)"
          className="inline-flex h-10 min-h-10 cursor-not-allowed items-center justify-center rounded-full border border-border bg-background px-4 text-xs font-semibold text-muted opacity-55"
        >
          Delete
        </button>
      </div>
    </article>
  );
}

function formatUploadDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function PdfGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}
