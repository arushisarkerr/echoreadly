/**
 * List PDF objects from the private `pdfs` Supabase Storage bucket.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { PDFS_BUCKET } from "@/constants";
import { createClient } from "@/lib/supabase/client";

export type StoredPdfObject = {
  /** Object key within the bucket. */
  name: string;
  /** Object key (same as name at bucket root). */
  path: string;
  /** Bucket-qualified path (`pdfs/<key>`). Not a public URL. */
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
 * Fetch PDF objects from Storage, newest first.
 */
export async function listPdfs(
  client?: SupabaseClient,
): Promise<ListPdfsResult> {
  const supabase = client ?? createClient();

  try {
    const { data, error } = await supabase.storage.from(PDFS_BUCKET).list("", {
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

        return {
          name: entry.name,
          path: entry.name,
          storagePath: `${PDFS_BUCKET}/${entry.name}`,
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
