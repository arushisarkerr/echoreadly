"use client";

import { useRef, useState } from "react";

import { ACCEPTED_PDF_MIME } from "@/constants";
import { notifyLibraryChanged } from "@/features/library";
import { uploadPdf } from "@/lib/storage";
import { getPdfValidationMessage, validatePdfFile } from "@/lib/validators";
import { formatFileSize, getApiErrorMessage } from "@/utils";

import { Dropzone, type DropzoneHandle } from "./dropzone";
import { FilePreview } from "./file-preview";
import { INITIAL_UPLOAD_STATE, type UploadUiState } from "./upload-state";

/**
 * Dashboard upload card: validate locally, then upload to Supabase Storage.
 */
export function UploadCard() {
  const dropzoneRef = useRef<DropzoneHandle>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadUiState>(INITIAL_UPLOAD_STATE);

  function removeFile() {
    setState(INITIAL_UPLOAD_STATE);
  }

  function handleFile(file: File) {
    const result = validatePdfFile(file);

    if (!result.ok) {
      setState({
        ...INITIAL_UPLOAD_STATE,
        status: "invalid",
        validationError: result.error,
      });
      return;
    }

    setState({
      ...INITIAL_UPLOAD_STATE,
      status: "selected",
      file: result.file,
      sourceFile: file,
    });
  }

  async function handleUpload() {
    if (state.status !== "selected" && state.status !== "failed") {
      return;
    }

    if (!state.sourceFile || !state.file) {
      return;
    }

    setState((current) => ({
      ...current,
      status: "uploading",
      uploadError: null,
      progressPercent: null,
      uploadedPath: null,
      uploadedStoragePath: null,
    }));

    try {
      const preflight = await fetch("/api/documents/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: state.sourceFile.name,
          fileSize: state.sourceFile.size,
          mimeType: state.sourceFile.type || ACCEPTED_PDF_MIME,
        }),
      });

      const preflightJson = (await preflight.json()) as
        | { ok: true }
        | { ok: false; error: unknown };

      if (!preflight.ok || !preflightJson.ok) {
        setState((current) => ({
          ...current,
          status: "failed",
          uploadError: {
            code: "validation_failed",
            message: getApiErrorMessage(
              preflightJson.ok === false ? preflightJson.error : null,
              "Upload was rejected. Please try again.",
            ),
          },
          progressPercent: null,
          uploadedPath: null,
          uploadedStoragePath: null,
        }));
        return;
      }
    } catch {
      setState((current) => ({
        ...current,
        status: "failed",
        uploadError: {
          code: "network_error",
          message: "Network error while preparing upload.",
        },
        progressPercent: null,
        uploadedPath: null,
        uploadedStoragePath: null,
      }));
      return;
    }

    const result = await uploadPdf(state.sourceFile, {
      onProgress: (progress) => {
        setState((current) => ({
          ...current,
          progressPercent: progress.percent,
        }));
      },
    });

    if (result.status === "error" || result.error) {
      setState((current) => ({
        ...current,
        status: "failed",
        uploadError: result.error,
        progressPercent: null,
        uploadedPath: null,
        uploadedStoragePath: null,
      }));
      return;
    }

    setState((current) => ({
      ...current,
      status: "success",
      uploadError: null,
      progressPercent: 100,
      uploadedPath: result.path,
      uploadedStoragePath: result.storagePath,
    }));

    notifyLibraryChanged();
  }

  const showDropzone =
    state.status === "idle" ||
    state.status === "dragging" ||
    state.status === "invalid";

  const validationMessage =
    state.status === "invalid" && state.validationError
      ? getPdfValidationMessage(state.validationError)
      : null;

  const previewStatus =
    state.status === "uploading"
      ? "uploading"
      : state.status === "success"
        ? "success"
        : state.status === "failed"
          ? "failed"
          : "ready";

  const previewMessage =
    state.status === "success" && state.uploadedStoragePath
      ? `Stored at ${state.uploadedStoragePath}`
      : state.status === "failed" && state.uploadError
        ? state.uploadError.message
        : null;

  const canUpload =
    (state.status === "selected" || state.status === "failed") &&
    Boolean(state.sourceFile);

  return (
    <section
      aria-labelledby="upload-card-heading"
      className="w-full rounded-lg border border-border bg-background p-5 sm:p-6"
    >
      <h2 id="upload-card-heading" className="sr-only">
        Upload PDF
      </h2>

      <input
        ref={replaceInputRef}
        type="file"
        accept={ACCEPTED_PDF_MIME}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            handleFile(file);
          }
          event.target.value = "";
        }}
      />

      {showDropzone ? (
        <Dropzone
          ref={dropzoneRef}
          dragging={state.status === "dragging"}
          errorMessage={validationMessage}
          onDraggingChange={(dragging) => {
            setState((current) => ({
              ...current,
              status: dragging
                ? "dragging"
                : current.validationError
                  ? "invalid"
                  : "idle",
            }));
          }}
          onFile={handleFile}
        />
      ) : state.file ? (
        <FilePreview
          name={state.file.name}
          sizeLabel={formatFileSize(state.file.size)}
          status={previewStatus}
          progressPercent={state.progressPercent}
          statusMessage={previewMessage}
          onReplace={() => replaceInputRef.current?.click()}
          onRemove={removeFile}
        />
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        {showDropzone ? (
          <>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90"
              onClick={() => dropzoneRef.current?.open()}
            >
              Select PDF
            </button>
            <button
              type="button"
              disabled
              className="inline-flex h-11 cursor-not-allowed items-center justify-center rounded-md border border-border bg-surface px-5 text-sm font-medium text-muted opacity-60"
            >
              Recent Files
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={!canUpload || state.status === "uploading"}
              onClick={() => {
                void handleUpload();
              }}
              className="inline-flex h-11 items-center justify-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state.status === "uploading"
                ? "Uploading…"
                : state.status === "failed"
                  ? "Retry upload"
                  : state.status === "success"
                    ? "Uploaded"
                    : "Upload PDF"}
            </button>
            <button
              type="button"
              disabled={state.status === "uploading"}
              onClick={() => replaceInputRef.current?.click()}
              className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-surface px-5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Replace file
            </button>
          </>
        )}
      </div>
    </section>
  );
}
