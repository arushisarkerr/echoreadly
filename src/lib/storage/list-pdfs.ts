/**
 * List PDF objects from the private `pdfs` Supabase Storage bucket.
 * Only lists objects under the signed-in user's `{userId}/` prefix.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { PDFS_BUCKET } from "@/constants";
import { createClient } from "@/lib/supabase/client";

import { userPdfFolderPrefix } from "./ownership";

export type StoredPdfObject = {
  /** Display file name (object basename). */
  name: string;
  /** Object key within the bucket (`{userId}/{fileId}.pdf`). */
  path: string;
  /** Bucket-qualified path (`pdfs/{userId}/{fileId}.pdf`). Not a public URL. */
  storagePath: string;
  /** File size in bytes when metadata is available. */
  size: number;
  /** ISO timestamp when available. */
  createdAt: string | null;
};

export type ListPdfsResult = {
  items: StoredPdfObject[];
  error: string | null;
};

function isPdfObject(name: string, id: string | null): boolean {
  return Boolean(id) && name.toLowerCase().endsWith(".pdf");
}

/**
 * Fetch the current user's PDF objects from Storage, newest first.
 */
export async function listPdfs(
  client?: SupabaseClient,
): Promise<ListPdfsResult> {
  const supabase = client ?? createClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        items: [],
        error: "Authentication required.",
      };
    }

    const folder = userPdfFolderPrefix(user.id);

    const { data, error } = await supabase.storage.from(PDFS_BUCKET).list(folder, {
      limit: 100,
      offset: 0,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (error) {
      return {
        items: [],
        error: error.message || "Unable to load library.",
      };
    }

    const items = (data ?? [])
      .filter((entry) => isPdfObject(entry.name, entry.id))
      .map((entry) => {
        const size =
          typeof entry.metadata?.size === "number" ? entry.metadata.size : 0;
        const objectKey = `${folder}/${entry.name}`;

        return {
          name: entry.name,
          path: objectKey,
          storagePath: `${PDFS_BUCKET}/${objectKey}`,
          size,
          createdAt: entry.created_at ?? entry.updated_at ?? null,
        } satisfies StoredPdfObject;
      })
      .sort((a, b) => {
        const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
        return bTime - aTime;
      });

    return { items, error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load library.";

    return {
      items: [],
      error: message,
    };
  }
}
