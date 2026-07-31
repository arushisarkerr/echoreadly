"use client";

import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";

type PdfUploadErrorProps = {
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
};

export function PdfUploadError({
  message,
  onDismiss,
  onRetry,
}: PdfUploadErrorProps) {
  return (
    <Card className="border-danger/30 bg-[color-mix(in_srgb,var(--danger)_8%,var(--surface))]">
      <CardHeader title="Import failed" description={message} />
      <div className="flex flex-wrap gap-2">
        {onRetry ? (
          <Button type="button" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
        {onDismiss ? (
          <Button type="button" variant="outline" onClick={onDismiss}>
            Dismiss
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
