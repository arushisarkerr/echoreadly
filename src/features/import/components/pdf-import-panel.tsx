"use client";

import { Button } from "@/components/ui/button";
import { PdfDropzone } from "@/features/import/components/pdf-dropzone";
import { PdfFileCard } from "@/features/import/components/pdf-file-card";
import { PdfUploadError } from "@/features/import/components/pdf-upload-error";
import { PdfUploadProgress } from "@/features/import/components/pdf-upload-progress";
import { PdfUploadSuccess } from "@/features/import/components/pdf-upload-success";
import { usePdfUpload } from "@/features/import/hooks";

type PdfImportPanelProps = {
  preferOcr?: boolean;
};

export function PdfImportPanel({ preferOcr = false }: PdfImportPanelProps) {
  const {
    status,
    selected,
    progress,
    error,
    result,
    selectFile,
    upload,
    remove,
    reset,
    canUpload,
  } = usePdfUpload({ preferOcr });

  const isUploading = status === "uploading";

  return (
    <div className="space-y-4">
      {!selected && status !== "success" ? (
        <PdfDropzone
          disabled={isUploading}
          preferOcr={preferOcr}
          onFile={(file) => selectFile(file)}
        />
      ) : null}

      {selected ? (
        <PdfFileCard
          file={selected}
          disabled={isUploading}
          onRemove={() => {
            void remove();
          }}
        />
      ) : null}

      {status === "uploading" ? (
        <PdfUploadProgress
          progress={progress}
          title={preferOcr ? "Uploading for OCR" : "Uploading"}
          description={
            preferOcr
              ? "Staging your scan securely for OCR processing."
              : "Staging your file securely for the next processing steps."
          }
        />
      ) : null}

      {status === "success" && result ? (
        <PdfUploadSuccess
          result={result}
          onUploadAnother={() => {
            reset();
          }}
          title={preferOcr ? "OCR file uploaded" : "Uploaded"}
          anotherLabel={preferOcr ? "Upload another scan" : "Upload another"}
        />
      ) : null}

      {error ? (
        <PdfUploadError
          message={error}
          onDismiss={() => {
            reset();
          }}
          onRetry={
            selected && status === "failed"
              ? () => {
                  void upload();
                }
              : undefined
          }
        />
      ) : null}

      {selected && status === "idle" ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={!canUpload} onClick={() => void upload()}>
            Upload
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void remove();
            }}
          >
            Remove
          </Button>
        </div>
      ) : null}
    </div>
  );
}
