"use client";

import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import type { PdfUploadResult } from "@/features/import/types";
import { formatFileSize } from "@/features/import/utils/format-file-size";

type PdfUploadSuccessProps = {
  result: PdfUploadResult;
  onUploadAnother: () => void;
  title?: string;
  anotherLabel?: string;
};

export function PdfUploadSuccess({
  result,
  onUploadAnother,
  title = "Uploaded",
  anotherLabel = "Upload another",
}: PdfUploadSuccessProps) {
  return (
    <Card className="border-accent/30 bg-[color-mix(in_srgb,var(--accent)_6%,var(--surface))]">
      <CardHeader
        title={title}
        description={`${result.name} · ${formatFileSize(result.size)}`}
      />
      <p className="text-sm text-muted">
        Your import is staged in the library and queued for processing.
      </p>
      <div className="mt-5">
        <Button type="button" variant="secondary" onClick={onUploadAnother}>
          {anotherLabel}
        </Button>
      </div>
    </Card>
  );
}
