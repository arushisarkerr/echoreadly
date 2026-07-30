/**
 * Create short-lived signed URLs for private document objects.
 * Never generates a permanent public URL for the `pdfs` bucket.
 * Only signs objects owned by the signed-in user (`{userId}/…`).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { PDFS_BUCKET, isSupportedDocumentExtension } from "@/constants";
import { createClient } from "@/lib/supabase/client";

import { isOwnedDocumentObjectKey } from "./ownership";

/** Default signed URL lifetime: 1 hour. */
export const PDF_SIGNED_URL_EXPIRES_IN = 60 * 60;

export type PdfSignedUrlResult = {
  signedUrl: string | null;
  error: string | null;
};

/**
 * Normalize a storage path or object key into a bucket object key.
 * Accepts `pdfs/{userId}/file.ext` or `{userId}/file.ext`.
 */
export function toPdfObjectKey(storagePath: string): string {
  const trimmed = storagePath.replace(/^\/+/, "").trim();

  if (trimmed.startsWith(`${PDFS_BUCKET}/`)) {
    return trimmed.slice(PDFS_BUCKET.length + 1);
  }

  return trimmed;
}

/**
 * Create a temporary signed URL for a private document owned by the caller.
 */
export async function createPdfSignedUrl(
  storagePath: string,
  options?: {
    client?: SupabaseClient;
    expiresIn?: number;
  },
): Promise<PdfSignedUrlResult> {
  const objectKey = toPdfObjectKey(storagePath);

  if (!objectKey || !isSupportedDocumentExtension(objectKey)) {
    return {
      signedUrl: null,
      error: "Invalid document storage path.",
    };
  }

  const client = options?.client ?? createClient();
  const expiresIn = options?.expiresIn ?? PDF_SIGNED_URL_EXPIRES_IN;

  try {
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();

    if (authError || !user) {
      return {
        signedUrl: null,
        error: "Authentication required.",
      };
    }

    if (!isOwnedDocumentObjectKey(objectKey, user.id)) {
      return {
        signedUrl: null,
        error: "You do not have access to this document.",
      };
    }

    const { data, error } = await client.storage
      .from(PDFS_BUCKET)
      .createSignedUrl(objectKey, expiresIn);

    if (error || !data?.signedUrl) {
      return {
        signedUrl: null,
        error:
          error?.message || "Unable to create a signed URL for this document.",
      };
    }

    return {
      signedUrl: data.signedUrl,
      error: null,
    };
  } catch (error) {
    return {
      signedUrl: null,
      error:
        error instanceof Error
          ? error.message
          : "Unable to create a signed URL for this document.",
    };
  }
}
