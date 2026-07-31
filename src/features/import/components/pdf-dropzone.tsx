"use client";

import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";

import { IconFile, IconImport } from "@/components/icons/dashboard-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PDF_ACCEPT, PDF_MAX_BYTES } from "@/features/import/utils/constants";
import { formatFileSize } from "@/features/import/utils/format-file-size";
import { cn } from "@/utils";

type PdfDropzoneProps = {
  disabled?: boolean;
  onFile: (file: File) => void;
};

export function PdfDropzone({ disabled = false, onFile }: PdfDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  function openPicker() {
    if (disabled) {
      return;
    }
    inputRef.current?.click();
  }

  function handleFiles(list: FileList | null) {
    const file = list?.item(0);
    if (file) {
      onFile(file);
    }
  }

  function onDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) {
      return;
    }
    dragDepth.current += 1;
    setDragging(true);
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) {
      setDragging(false);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    setDragging(false);
    if (disabled) {
      return;
    }
    handleFiles(event.dataTransfer.files);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  }

  return (
    <Card
      padding="lg"
      className={cn(
        "outline-none transition-[border-color,background-color,box-shadow] duration-200",
        dragging &&
          "border-accent bg-[color-mix(in_srgb,var(--accent)_8%,var(--surface))] shadow-[var(--elevation-md)]",
        disabled && "opacity-60",
      )}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label="Document upload dropzone. Drop a PDF, DOCX, EPUB, or TXT file or press Enter to choose a file."
      onKeyDown={onKeyDown}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-surface-muted text-foreground">
          <IconImport className="size-5" />
        </div>
        <h2 className="font-display mt-5 text-xl font-semibold text-foreground">
          Drop a file to import
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted">
          PDF, DOCX, EPUB, TXT · up to {formatFileSize(PDF_MAX_BYTES)}. Drag a
          file here or choose one from your device.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            disabled={disabled}
            leftIcon={<IconFile className="size-3.5" />}
            onClick={(event) => {
              event.stopPropagation();
              openPicker();
            }}
          >
            Choose file
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={PDF_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        disabled={disabled}
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </Card>
  );
}
