"use client";

import { Card, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";

type PdfUploadProgressProps = {
  progress: number;
  title?: string;
  description?: string;
};

export function PdfUploadProgress({
  progress,
  title = "Uploading",
  description = "Staging your file securely for the next processing steps.",
}: PdfUploadProgressProps) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <ProgressBar value={progress} label="Upload progress" />
    </Card>
  );
}
