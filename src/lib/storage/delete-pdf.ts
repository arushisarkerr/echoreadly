/**
 * Remove a private PDF object from the `pdfs` Storage bucket.
 * Only removes objects owned by the signed-in user (`{userId}/…`).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { PDFS_BUCKET } from "@/constants";

import { toPdfObjectKey } from "./create-signed-url";
import { isOwnedPdfObjectKey } from "./ownership";

export type RemovePdfResult =
  | { ok: true; objectKey: string }
  | { ok: false; error: string };

/**
 * Delete a PDF object from Storage after verifying ownership.
 */
export async function removePdfObject(
  storagePath: string,
  client: SupabaseClient,
): Promise<RemovePdfResult> {
  const objectKey = toPdfObjectKey(storagePath);

  if (!objectKey) {
    return { ok: false, error: "Invalid PDF storage path." };
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();

    if (authError || !user) {
      return { ok: false, error: "Authentication required." };
    }

    if (!isOwnedPdfObjectKey(objectKey, user.id)) {
      return {
        ok: false,
        error: "You do not have access to this PDF.",
      };
    }

    const { error } = await client.storage.from(PDFS_BUCKET).remove([objectKey]);

    if (error) {
      return {
        ok: false,
        error: error.message || "Unable to delete PDF from storage.",
      };
    }

    return { ok: true, objectKey };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to delete PDF from storage.",
    };
  }
}
