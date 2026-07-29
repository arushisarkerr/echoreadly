import Link from "next/link";

/**
 * Empty library state with a path back to the upload experience.
 */
export function LibraryEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center">
      <div
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-lg border border-border bg-surface-muted text-foreground"
      >
        <PdfGlyph className="size-6" />
      </div>

      <h2 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
        No PDFs yet
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
        Upload your first PDF to start reading with AI.
      </p>

      <Link
        href="/dashboard"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        Upload PDF
      </Link>
    </div>
  );
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
