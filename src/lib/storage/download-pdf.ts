/**
 * Download private PDF object bytes from Supabase Storage.
 * Callers must pass an authenticated Supabase client (SSR user client on the server).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { PDFS_BUCKET } from "@/constants";

import { toPdfObjectKey } from "./create-signed-url";

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
