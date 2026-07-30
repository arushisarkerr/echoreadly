/**
 * Download private PDF object bytes from Supabase Storage.
 * Callers must pass an authenticated Supabase client (SSR user client on the server).
 * Only downloads objects owned by the signed-in user (`{userId}/…`).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { PDFS_BUCKET } from "@/constants";

import { toPdfObjectKey } from "./create-signed-url";
import { isOwnedPdfObjectKey } from "./ownership";

export type DownloadPdfResult = {
  data: Uint8Array | null;
  error: string | null;
};

/**
 * Download a PDF object as bytes for processing (text extraction, etc.).
 */
export async function downloadPdfBytes(
  storagePath: string,
  client: SupabaseClient,
): Promise<DownloadPdfResult> {
  const objectKey = toPdfObjectKey(storagePath);

  if (!objectKey) {
    return {
      data: null,
      error: "Invalid PDF storage path.",
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

    if (!isOwnedPdfObjectKey(objectKey, user.id)) {
      return {
        data: null,
        error: "You do not have access to this PDF.",
      };
    }

    const { data, error } = await client.storage
      .from(PDFS_BUCKET)
      .download(objectKey);

    if (error || !data) {
      return {
        data: null,
        error: error?.message || "Unable to download PDF from storage.",
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
          : "Unable to download PDF from storage.",
    };
  }
}
