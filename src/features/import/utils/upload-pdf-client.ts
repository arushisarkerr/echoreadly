import type {
  PdfUploadProgressEvent,
  PdfUploadResult,
} from "@/features/import/types";

type UploadPdfClientOptions = {
  ownerId: string;
  onProgress?: (event: PdfUploadProgressEvent) => void;
  signal?: AbortSignal;
};

type UploadApiSuccess = {
  ok: true;
  result: PdfUploadResult;
};

type UploadApiFailure = {
  ok: false;
  error?: string;
};

/**
 * Upload a PDF through the import API with byte-level progress events.
 */
export function uploadPdfToSupabase(
  file: File,
  options: UploadPdfClientOptions,
): Promise<PdfUploadResult> {
  const { ownerId, onProgress, signal } = options;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file);
    form.append("ownerId", ownerId);

    function cleanup() {
      signal?.removeEventListener("abort", onAbort);
    }

    function onAbort() {
      xhr.abort();
    }

    if (signal) {
      if (signal.aborted) {
        reject(new DOMException("Upload cancelled.", "AbortError"));
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }
      const percent =
        event.total === 0
          ? 100
          : Math.min(99, Math.round((event.loaded / event.total) * 100));
      onProgress?.({
        loaded: event.loaded,
        total: event.total,
        percent,
      });
    };

    xhr.onerror = () => {
      cleanup();
      reject(new Error("Network error. Check your connection and try again."));
    };

    xhr.onabort = () => {
      cleanup();
      reject(new DOMException("Upload cancelled.", "AbortError"));
    };

    xhr.onload = () => {
      cleanup();

      let payload: UploadApiSuccess | UploadApiFailure | null = null;
      try {
        payload = JSON.parse(xhr.responseText) as UploadApiSuccess | UploadApiFailure;
      } catch {
        payload = null;
      }

      if (xhr.status >= 200 && xhr.status < 300 && payload?.ok) {
        onProgress?.({
          loaded: file.size,
          total: file.size,
          percent: 100,
        });
        resolve(payload.result);
        return;
      }

      const message =
        payload && !payload.ok && payload.error
          ? payload.error
          : "Upload failed. Please try again.";
      reject(new Error(message));
    };

    onProgress?.({ loaded: 0, total: file.size, percent: 0 });
    xhr.open("POST", "/api/import/pdf");
    xhr.send(form);
  });
}

/**
 * Best-effort delete of a previously uploaded PDF.
 */
export async function removeUploadedPdf(result: PdfUploadResult): Promise<void> {
  const response = await fetch("/api/import/pdf", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: result.path,
      storagePath: result.storagePath,
      ownerId: result.ownerId,
    }),
  });

  if (!response.ok) {
    let message = "Unable to remove uploaded PDF.";
    try {
      const payload = (await response.json()) as UploadApiFailure;
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      // Keep default message.
    }
    throw new Error(message);
  }
}
