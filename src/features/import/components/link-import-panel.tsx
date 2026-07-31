"use client";

import { IconLink } from "@/components/icons/dashboard-icons";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PdfUploadError } from "@/features/import/components/pdf-upload-error";
import { PdfUploadProgress } from "@/features/import/components/pdf-upload-progress";
import { PdfUploadSuccess } from "@/features/import/components/pdf-upload-success";
import { useLinkImport } from "@/features/import/hooks/use-link-import";

/**
 * Links tab panel — same progress / error / success shells as file upload.
 */
export function LinkImportPanel() {
  const {
    status,
    url,
    progress,
    error,
    result,
    setUrl,
    submit,
    reset,
    canSubmit,
  } = useLinkImport();

  const isUploading = status === "uploading";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Import from the web"
          description="Website, blog, or YouTube URLs."
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://…"
              leftSlot={<IconLink />}
              aria-label="Import URL"
              disabled={isUploading || status === "success"}
              onKeyDown={(event) => {
                if (event.key === "Enter" && canSubmit) {
                  event.preventDefault();
                  void submit();
                }
              }}
            />
          </div>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() => {
              void submit();
            }}
          >
            Add link
          </Button>
        </div>
      </Card>

      {status === "uploading" ? (
        <PdfUploadProgress
          progress={progress}
          title="Importing link"
          description="Fetching content and queuing it through the shared processing pipeline."
        />
      ) : null}

      {status === "success" && result ? (
        <PdfUploadSuccess
          result={result}
          onUploadAnother={() => {
            reset();
          }}
          title="Link imported"
          anotherLabel="Import another link"
        />
      ) : null}

      {error ? (
        <PdfUploadError
          message={error}
          onDismiss={() => {
            reset();
          }}
          onRetry={
            status === "failed"
              ? () => {
                  void submit();
                }
              : undefined
          }
        />
      ) : null}
    </div>
  );
}
