/**
 * Delete cached audio exports for a document storage path.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { removeAudioExportObjects } from "@/lib/storage";

import { deleteAudioExportsByStoragePath } from "./persistence";

export type DeleteExportsResult =
  | { ok: true; deletedRows: number; removedObjects: number }
  | { ok: false; error: string };

/**
 * Remove DB rows and Storage objects for exports tied to a PDF path.
 */
export async function deleteOwnedAudioExportsForDocument(
  storagePath: string,
  userId: string,
  client: SupabaseClient,
): Promise<DeleteExportsResult> {
  const db = await deleteAudioExportsByStoragePath(
    storagePath,
    userId,
    client,
  );

  if (!db.ok) {
    return { ok: false, error: db.error };
  }

  const storage = await removeAudioExportObjects(db.data.objectKeys, client);
  if (!storage.ok) {
    return { ok: false, error: storage.error };
  }

  return {
    ok: true,
    deletedRows: db.data.deletedCount,
    removedObjects: storage.removedCount,
  };
}
