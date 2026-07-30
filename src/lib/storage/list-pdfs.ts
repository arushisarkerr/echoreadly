/**
 * List PDF objects from the private `pdfs` Supabase Storage bucket.
 * Only lists objects under the signed-in user's `{userId}/` prefix.
 * Pages are fetched one at a time — never the full library.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { PDFS_BUCKET } from "@/constants";
import { createClient } from "@/lib/supabase/client";

import { userPdfFolderPrefix } from "./ownership";

/** Default page size for library inventory fetches. */
export const LIBRARY_PAGE_SIZE = 24;

/** Hard cap so clients cannot request unbounded pages. */
export const LIBRARY_PAGE_SIZE_MAX = 50;

export type ListPdfsSort = "newest" | "oldest" | "name";

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

export type ListPdfsPageInput = {
  /** Page size (clamped). Defaults to {@link LIBRARY_PAGE_SIZE}. */
  limit?: number;
  /** Storage list offset for this page. */
  offset?: number;
  /** Server-side sort order. */
  sort?: ListPdfsSort;
  client?: SupabaseClient;
};

export type ListPdfsPageResult = {
  items: StoredPdfObject[];
  /** Pass as `offset` for the next page; `null` when `hasMore` is false. */
  nextOffset: number | null;
  hasMore: boolean;
  error: string | null;
};

/** @deprecated Prefer {@link listPdfsPage}. Kept for callers that only need page 1. */
export type ListPdfsResult = {
  items: StoredPdfObject[];
  error: string | null;
};

function isDocumentObject(name: string, id: string | null): boolean {
  if (!id) {
    return false;
  }
  const lower = name.toLowerCase();
  return (
    lower.endsWith(".pdf") ||
    lower.endsWith(".docx") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".md") ||
    lower.endsWith(".markdown")
  );
}

function clampPageSize(value: number | undefined): number {
  const raw = typeof value === "number" && Number.isFinite(value) ? value : LIBRARY_PAGE_SIZE;
  return Math.min(LIBRARY_PAGE_SIZE_MAX, Math.max(1, Math.floor(raw)));
}

function storageSortBy(sort: ListPdfsSort): {
  column: "name" | "created_at";
  order: "asc" | "desc";
} {
  switch (sort) {
    case "oldest":
      return { column: "created_at", order: "asc" };
    case "name":
      return { column: "name", order: "asc" };
    case "newest":
    default:
      return { column: "created_at", order: "desc" };
  }
}

function mapEntry(
  folder: string,
  entry: {
    id: string | null;
    name: string;
    metadata?: { size?: number } | null;
    created_at?: string | null;
    updated_at?: string | null;
  },
): StoredPdfObject | null {
  if (!isDocumentObject(entry.name, entry.id)) {
    return null;
  }

  const size =
    typeof entry.metadata?.size === "number" ? entry.metadata.size : 0;
  const objectKey = `${folder}/${entry.name}`;

  return {
    name: entry.name,
    path: objectKey,
    storagePath: `${PDFS_BUCKET}/${objectKey}`,
    size,
    createdAt: entry.created_at ?? entry.updated_at ?? null,
  };
}

/**
 * Fetch one page of the current user's PDF objects from Storage.
 */
export async function listPdfsPage(
  input: ListPdfsPageInput = {},
): Promise<ListPdfsPageResult> {
  const supabase = input.client ?? createClient();
  const limit = clampPageSize(input.limit);
  const offset = Math.max(0, Math.floor(input.offset ?? 0));
  const sort = input.sort ?? "newest";

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        items: [],
        nextOffset: null,
        hasMore: false,
        error: "Authentication required.",
      };
    }

    const folder = userPdfFolderPrefix(user.id);

    const { data, error } = await supabase.storage.from(PDFS_BUCKET).list(folder, {
      limit: limit + 1,
      offset,
      sortBy: storageSortBy(sort),
    });

    if (error) {
      return {
        items: [],
        nextOffset: null,
        hasMore: false,
        error: error.message || "Unable to load library.",
      };
    }

    const raw = data ?? [];
    const hasMore = raw.length > limit;
    const page = hasMore ? raw.slice(0, limit) : raw;

    const items = page
      .map((entry) => mapEntry(folder, entry))
      .filter((entry): entry is StoredPdfObject => entry !== null);

    return {
      items,
      nextOffset: hasMore ? offset + limit : null,
      hasMore,
      error: null,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load library.";

    return {
      items: [],
      nextOffset: null,
      hasMore: false,
      error: message,
    };
  }
}

/**
 * Fetch the first page of the current user's PDF objects (newest first).
 */
export async function listPdfs(
  client?: SupabaseClient,
): Promise<ListPdfsResult> {
  const result = await listPdfsPage({
    client,
    limit: LIBRARY_PAGE_SIZE,
    offset: 0,
    sort: "newest",
  });

  return {
    items: result.items,
    error: result.error,
  };
}
