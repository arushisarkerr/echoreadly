/**
 * Cascade cleanup for collection memberships when a Storage document is deleted.
 * Accepts an authenticated Supabase client only — no browser/server client import.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { uniqueStoragePathVariants } from "@/features/persistence/storage-path";

import type { CollectionsResult } from "./types";

/**
 * Delete all memberships for a storage path owned by `userId`.
 */
export async function deleteCollectionMembershipsByStoragePath(
  storagePath: string,
  userId: string,
  client: SupabaseClient,
): Promise<CollectionsResult<{ deletedCount: number }>> {
  try {
    const paths = uniqueStoragePathVariants(storagePath);

    const { data, error } = await client
      .from("collection_documents")
      .delete()
      .eq("user_id", userId)
      .in("storage_path", paths)
      .select("id");

    if (error) {
      return { ok: false, error: error.message };
    }

    return {
      ok: true,
      data: { deletedCount: data?.length ?? 0 },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to clear collection memberships.",
    };
  }
}
