"use client";

import { getApiErrorMessage } from "@/utils";

export type DeleteDocumentPayload = {
  storagePath: string;
};

export type DeleteDocumentClientResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Request server-side deletion of an owned PDF and related records.
 */
export async function requestDeleteDocument(
  payload: DeleteDocumentPayload,
): Promise<DeleteDocumentClientResult> {
  const response = await fetch("/api/documents/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = (await response.json()) as
    | { ok: true; data: { deleted: true; storagePath: string } }
    | { ok: false; error: unknown };

  if (!response.ok || !json.ok) {
    return {
      ok: false,
      error:
        json.ok === false
          ? getApiErrorMessage(json.error, "Unable to delete this document.")
          : "Unable to delete this document.",
    };
  }

  return { ok: true };
}
