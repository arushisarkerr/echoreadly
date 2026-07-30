"use client";

import { useRef, useState } from "react";

import {
  ACCEPTED_DOCUMENT_ACCEPT,
  canonicalMimeForFormat,
  formatLabel,
  SUPPORTED_DOCUMENT_FORMATS_LABEL,
} from "@/constants";
import { notifyLibraryChanged } from "@/features/library";
import { uploadDocument } from "@/lib/storage";
import {
  getDocumentValidationMessage,
  validateDocumentFile,
} from "@/lib/validators";
import { formatFileSize, getApiErrorMessage } from "@/utils";

import { Dropzone, type DropzoneHandle } from "./dropzone";
import { FilePreview } from "./file-preview";
import { INITIAL_UPLOAD_STATE, type UploadUiState } from "./upload-state";

/**
 * Dashboard upload card: validate locally, then upload to Supabase Storage.
 * Supports PDF, DOCX, TXT, and Markdown — same private shelf pipeline.
 */
export function UploadCard() {
  const dropzoneRef = useRef<DropzoneHandle>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const uploadLockRef = useRef(false);
  const [state, setState] = useState<UploadUiState>(INITIAL_UPLOAD_STATE);
  const [lastUploadedName, setLastUploadedName] = useState<string | null>(null);

  function removeFile() {
    uploadLockRef.current = false;
    setState(INITIAL_UPLOAD_STATE);
  }

  function handleFile(file: File) {
    const result = validateDocumentFile(file);

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
    if (uploadLockRef.current) {
      return;
    }

    if (state.status !== "selected" && state.status !== "failed") {
      return;
    }

    if (!state.sourceFile || !state.file) {
      return;
    }

    uploadLockRef.current = true;

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
          mimeType:
            state.sourceFile.type ||
            canonicalMimeForFormat(state.file.format),
        }),
      });

      const preflightJson = (await preflight.json()) as
        | { ok: true }
        | { ok: false; error: unknown };

      if (!preflight.ok || !preflightJson.ok) {
        uploadLockRef.current = false;
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
      uploadLockRef.current = false;
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

    const result = await uploadDocument(state.sourceFile, {
      onProgress: (progress) => {
        setState((current) => ({
          ...current,
          progressPercent: progress.percent,
        }));
      },
    });

    if (result.status === "error" || result.error) {
      uploadLockRef.current = false;
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

    setLastUploadedName(state.sourceFile.name);
    uploadLockRef.current = false;

    setState((current) => ({
      ...current,
      status: "success",
      uploadError: null,
      progressPercent: 100,
      uploadedPath: result.path,
      uploadedStoragePath: result.storagePath,
    }));

    if (result.storagePath) {
      void fetch("/api/jobs", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobType: "document_process",
          storagePath: result.storagePath,
          payload: {
            storagePath: result.storagePath,
            originalFileName: state.sourceFile.name,
            fileSize: state.sourceFile.size,
          },
        }),
      }).catch(() => {
        // Best-effort background processing enqueue.
      });
    }

    notifyLibraryChanged();
  }

  const showDropzone =
    state.status === "idle" ||
    state.status === "dragging" ||
    state.status === "invalid";

  const validationMessage =
    state.status === "invalid" && state.validationError
      ? getDocumentValidationMessage(state.validationError)
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
    state.status === "success"
      ? "Saved privately to your EchoReadly shelf — ready for reading, summaries, and listening."
      : state.status === "failed" && state.uploadError
        ? state.uploadError.message
        : state.status === "uploading"
          ? "Uploading and preparing your document…"
          : null;

  const softNotice =
    state.status === "selected" &&
    lastUploadedName &&
    state.file?.name === lastUploadedName
      ? "Same name as your last upload in this session. A new copy will still be stored."
      : state.status === "selected" && state.file
        ? `${formatLabel(state.file.format)} ready to upload`
        : null;

  const canUpload =
    (state.status === "selected" || state.status === "failed") &&
    Boolean(state.sourceFile);

  const busy = state.status === "uploading";

  return (
    <section
      aria-labelledby="upload-card-heading"
      className="w-full rounded-[1.75rem] border border-border/70 bg-[color-mix(in_srgb,var(--background)_70%,transparent)] p-4 sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            id="upload-card-heading"
            className="font-display text-base font-semibold tracking-tight text-foreground"
          >
            Document upload
          </h2>
          <p className="mt-1 text-xs text-muted">
            {SUPPORTED_DOCUMENT_FORMATS_LABEL} · private storage
          </p>
        </div>
        <p className="sr-only" aria-live="polite">
          {busy
            ? "Upload in progress"
            : state.status === "success"
              ? "Upload complete"
              : state.status === "failed"
                ? "Upload failed"
                : state.status === "invalid"
                  ? validationMessage
                  : ""}
        </p>
      </div>

      <input
        ref={replaceInputRef}
        type="file"
        accept={ACCEPTED_DOCUMENT_ACCEPT}
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
          sizeBytes={state.file.size}
          status={previewStatus}
          progressPercent={state.progressPercent}
          statusMessage={previewMessage}
          softNotice={softNotice}
          onReplace={() => replaceInputRef.current?.click()}
          onRemove={removeFile}
        />
      ) : null}

      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        {showDropzone ? (
          <>
            <button
              type="button"
              className="inline-flex h-11 min-h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => dropzoneRef.current?.open()}
            >
              Select file
            </button>
            <button
              type="button"
              disabled
              title="Coming soon"
              className="inline-flex h-11 min-h-11 cursor-not-allowed items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-medium text-muted opacity-60"
            >
              Recent Files
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={!canUpload || busy || state.status === "success"}
              onClick={() => {
                void handleUpload();
              }}
              className="inline-flex h-11 min-h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-55"
            >
              {busy
                ? "Uploading…"
                : state.status === "failed"
                  ? "Retry upload"
                  : state.status === "success"
                    ? "Uploaded"
                    : "Upload file"}
            </button>
            {state.status !== "success" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => replaceInputRef.current?.click()}
                className="inline-flex h-11 min-h-11 items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-55"
              >
                Replace file
              </button>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
