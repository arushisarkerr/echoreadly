"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type DragEvent,
  type KeyboardEvent,
} from "react";

import { ACCEPTED_PDF_MIME, MAX_PDF_UPLOAD_LABEL } from "@/constants";
import { cn } from "@/utils";

export type DropzoneHandle = {
  open: () => void;
};

type DropzoneProps = {
  dragging: boolean;
  disabled?: boolean;
  errorMessage?: string | null;
  onDraggingChange: (dragging: boolean) => void;
  onFile: (file: File) => void;
};

/**
 * Large PDF drop zone with click-to-browse support.
 * Emits selected files only — does not upload.
 */
export const Dropzone = forwardRef<DropzoneHandle, DropzoneProps>(
  function Dropzone(
    {
      dragging,
      disabled = false,
      errorMessage,
      onDraggingChange,
      onFile,
    },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement>(null);

    function openFilePicker() {
      if (disabled) {
        return;
      }
      inputRef.current?.click();
    }

    useImperativeHandle(ref, () => ({
      open: openFilePicker,
    }));

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openFilePicker();
      }
    }

    function handleDragOver(event: DragEvent<HTMLDivElement>) {
      event.preventDefault();
      if (!disabled) {
        onDraggingChange(true);
      }
    }

    function handleDragLeave(event: DragEvent<HTMLDivElement>) {
      event.preventDefault();
      onDraggingChange(false);
    }

    function handleDrop(event: DragEvent<HTMLDivElement>) {
      event.preventDefault();
      onDraggingChange(false);

      if (disabled) {
        return;
      }

      const file = event.dataTransfer.files?.[0];
      if (file) {
        onFile(file);
      }
    }

    return (
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label="Upload your PDF. Drag and drop a PDF here or click to browse."
        onClick={openFilePicker}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-14 text-center transition-colors sm:py-16",
          dragging
            ? "border-accent bg-accent/5"
            : "border-border bg-surface hover:border-foreground/20 hover:bg-background",
          disabled && "pointer-events-none cursor-not-allowed opacity-60",
          errorMessage && !dragging && "border-danger/50",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_PDF_MIME}
          className="sr-only"
          tabIndex={-1}
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              onFile(file);
            }
            event.target.value = "";
          }}
        />

        <div
          aria-hidden="true"
          className={cn(
            "flex size-14 items-center justify-center rounded-lg border bg-surface-muted text-foreground",
            dragging ? "border-accent/40" : "border-border",
          )}
        >
          <PdfIcon className="size-6" />
        </div>

        <h2 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
          Upload your PDF
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
          Drag & drop a PDF here or click to browse.
        </p>
        <p className="mt-4 text-xs text-subtle">
          PDF only ({ACCEPTED_PDF_MIME}) · Max {MAX_PDF_UPLOAD_LABEL}
        </p>

        {errorMessage ? (
          <p role="alert" className="mt-4 text-sm font-medium text-danger">
            {errorMessage}
          </p>
        ) : null}
      </div>
    );
  },
);

function PdfIcon({ className }: { className?: string }) {
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
