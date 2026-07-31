"use client";

import { IconClose, IconFile } from "@/components/icons/dashboard-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SelectedPdf } from "@/features/import/types";
import { formatFileSize } from "@/features/import/utils/format-file-size";

type PdfFileCardProps = {
  file: SelectedPdf;
  disabled?: boolean;
  onRemove: () => void;
};

export function PdfFileCard({ file, disabled = false, onRemove }: PdfFileCardProps) {
  return (
    <Card className="flex items-start gap-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-muted text-foreground">
        <IconFile className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{file.name}</p>
          <Badge>PDF</Badge>
        </div>
        <p className="mt-1 text-xs text-muted">{formatFileSize(file.size)}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 shrink-0"
        aria-label="Remove selected PDF"
        disabled={disabled}
        onClick={onRemove}
      >
        <IconClose />
      </Button>
    </Card>
  );
}
