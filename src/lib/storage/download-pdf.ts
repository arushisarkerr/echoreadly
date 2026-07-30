/**
 * Download private document object bytes from Supabase Storage.
 * Callers must pass an authenticated Supabase client (SSR user client on the server).
 * Only downloads objects owned by the signed-in user (`{userId}/…`).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { PDFS_BUCKET, isSupportedDocumentExtension } from "@/constants";

import { toPdfObjectKey } from "./create-signed-url";
import { isOwnedDocumentObjectKey } from "./ownership";

export type DownloadPdfResult = {
  data: Uint8Array | null;
  error: string | null;
};

/**
 * Download a document object as bytes for processing (text extraction, etc.).
 */
export async function downloadPdfBytes(
  storagePath: string,
  client: SupabaseClient,
): Promise<DownloadPdfResult> {
  const objectKey = toPdfObjectKey(storagePath);

  if (!objectKey || !isSupportedDocumentExtension(objectKey)) {
    return {
      data: null,
      error: "Invalid document storage path.",
    };
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();

    if (authError || !user) {
      return {
        data: null,
        error: "Authentication required.",
      };
    }

    if (!isOwnedDocumentObjectKey(objectKey, user.id)) {
      return {
        data: null,
        error: "You do not have access to this document.",
      };
    }

    const { data, error } = await client.storage
      .from(PDFS_BUCKET)
      .download(objectKey);

    if (error || !data) {
      return {
        data: null,
        error: error?.message || "Unable to download document from storage.",
      };
    }

    const buffer = new Uint8Array(await data.arrayBuffer());

    return {
      data: buffer,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Unable to download document from storage.",
    };
  }
}
