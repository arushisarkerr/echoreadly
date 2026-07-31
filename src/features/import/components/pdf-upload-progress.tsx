"use client";

import { Card, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";

type PdfUploadProgressProps = {
  progress: number;
};

export function PdfUploadProgress({ progress }: PdfUploadProgressProps) {
  return (
    <Card>
      <CardHeader
        title="Uploading PDF"
        description="Staging your file securely in this browser for the next processing steps."
      />
      <ProgressBar value={progress} label="Upload progress" />
    </Card>
  );
}
