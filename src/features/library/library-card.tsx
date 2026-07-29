import Link from "next/link";

import type { StoredPdfObject } from "@/lib/storage";
import { formatFileSize } from "@/utils";

type LibraryCardProps = {
  item: StoredPdfObject;
};

/**
 * Single library item card.
 * Open navigates to the reader; Delete remains a UI placeholder.
 */
export function LibraryCard({ item }: LibraryCardProps) {
  const uploadedLabel = formatUploadDate(item.createdAt);
  const readerHref = `/dashboard/reader/${item.storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;

  return (
    <article className="flex h-full flex-col rounded-lg border border-border bg-surface p-5 transition-colors hover:border-foreground/15">
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface-muted text-foreground"
        >
          <PdfGlyph className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold tracking-tight text-foreground">
            {item.name}
          </h3>
          <p className="mt-1 text-xs text-muted">
            {formatFileSize(item.size)}
            {uploadedLabel ? ` · ${uploadedLabel}` : null}
          </p>
          <p className="mt-2 truncate font-mono text-[0.6875rem] text-subtle">
            {item.storagePath}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={readerHref}
          className="inline-flex h-9 items-center justify-center rounded-md bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-90"
        >
          Open
        </Link>
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
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
