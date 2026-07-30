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
    const errorId = "upload-dropzone-error";
    const hintId = "upload-dropzone-hint";

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

    function handleDragEnter(event: DragEvent<HTMLDivElement>) {
      event.preventDefault();
      event.stopPropagation();
      if (!disabled) {
        onDraggingChange(true);
      }
    }

    function handleDragOver(event: DragEvent<HTMLDivElement>) {
      event.preventDefault();
      event.stopPropagation();
      if (disabled) {
        return;
      }
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
      onDraggingChange(true);
    }

    function handleDragLeave(event: DragEvent<HTMLDivElement>) {
      event.preventDefault();
      event.stopPropagation();
      const next = event.relatedTarget as Node | null;
      if (next && event.currentTarget.contains(next)) {
        return;
      }
      onDraggingChange(false);
    }

    function handleDrop(event: DragEvent<HTMLDivElement>) {
      event.preventDefault();
      event.stopPropagation();
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
        aria-disabled={disabled || undefined}
        aria-describedby={
          errorMessage ? `${hintId} ${errorId}` : hintId
        }
        aria-label="Upload your PDF. Drag and drop a PDF here, or press Enter to browse."
        onClick={openFilePicker}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed px-5 py-12 text-center transition-[border-color,background-color,box-shadow,transform] duration-200 sm:px-6 sm:py-14",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          dragging
            ? "scale-[1.01] border-accent bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] shadow-[var(--elevation-sm)]"
            : "border-border/80 bg-surface/60 hover:border-foreground/25 hover:bg-background/70",
          disabled && "pointer-events-none cursor-not-allowed opacity-60",
          errorMessage && !dragging && "border-danger/55 bg-[color-mix(in_srgb,var(--danger)_6%,transparent)]",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_PDF_MIME}
          className="sr-only"
          tabIndex={-1}
          disabled={disabled}
          aria-label="Choose a PDF file"
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
            "flex size-14 items-center justify-center rounded-2xl border bg-surface-muted text-foreground transition-colors",
            dragging ? "border-accent/45 bg-background" : "border-border",
          )}
        >
          <PdfIcon className="size-6" />
        </div>

        <h2 className="mt-5 font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {dragging ? "Drop PDF to import" : "Upload your PDF"}
        </h2>
        <p
          id={hintId}
          className="mt-2 max-w-sm text-sm leading-relaxed text-muted"
        >
          Drag & drop a PDF here, tap to browse, or use the Select PDF button.
        </p>
        <p className="mt-4 text-xs text-subtle">
          PDF only · Max {MAX_PDF_UPLOAD_LABEL} · One file at a time
        </p>

        {errorMessage ? (
          <p
            id={errorId}
            role="alert"
            className="mt-4 max-w-md text-sm font-medium text-danger"
          >
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
