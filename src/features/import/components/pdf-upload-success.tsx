"use client";

import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import type { PdfUploadResult } from "@/features/import/types";
import { formatFileSize } from "@/features/import/utils/format-file-size";

type PdfUploadSuccessProps = {
  result: PdfUploadResult;
  onUploadAnother: () => void;
};

export function PdfUploadSuccess({
  result,
  onUploadAnother,
}: PdfUploadSuccessProps) {
  return (
    <Card className="border-accent/30 bg-[color-mix(in_srgb,var(--accent)_6%,var(--surface))]">
      <CardHeader
        title="PDF uploaded"
        description={`${result.name} · ${formatFileSize(result.size)}`}
      />
      <p className="text-sm text-muted">
        Your PDF is staged and ready for future processing milestones. No parsing
        has run yet.
      </p>
      <div className="mt-5">
        <Button type="button" variant="secondary" onClick={onUploadAnother}>
          Upload another PDF
        </Button>
      </div>
    </Card>
  );
}
