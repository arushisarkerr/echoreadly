/**
 * Delete a user-owned PDF and related persisted processing data.
 */

import {
  deleteDocumentsByStoragePath,
  deleteListeningProgressByStoragePath,
} from "@/features/persistence";
import { deleteCollectionMembershipsByStoragePath } from "@/features/collections/delete-memberships";
import { deleteOwnedAudioExportsForDocument } from "@/features/export/delete-exports";
import { forgetDocumentByStoragePath } from "@/features/processing";
import { createClient } from "@/lib/supabase/server";
import { removePdfObject } from "@/lib/storage";

export type DeleteDocumentResult =
  | {
      ok: true;
      storagePath: string;
      removedFromStorage: boolean;
      deletedDocumentRows: number;
    }
  | { ok: false; error: string; code: "FORBIDDEN" | "NOT_FOUND" | "INTERNAL" };

/**
 * Verify ownership, remove Storage object, then delete DB rows (cascade).
 * Storage is deleted first so the library shelf updates; DB cleanup removes
 * chunks/summaries. Retrying delete is safe if one step already succeeded.
 */
export async function deleteOwnedDocument(
  storagePath: string,
): Promise<DeleteDocumentResult> {
  const trimmed = storagePath.trim();
  if (!trimmed) {
    return {
      ok: false,
      code: "NOT_FOUND",
      error: "Document not found.",
    };
  }

  try {
    const client = await createClient();
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();

    if (authError || !user) {
      return {
        ok: false,
        code: "FORBIDDEN",
        error: "Authentication required.",
      };
    }

    const storage = await removePdfObject(trimmed, client);

    if (!storage.ok) {
      const message = storage.error;
      const normalized = message.toLowerCase();

      if (
        normalized.includes("authentication") ||
        normalized.includes("do not have access")
      ) {
        return {
          ok: false,
          code: "FORBIDDEN",
          error: message,
        };
      }

      const missing =
        normalized.includes("not found") ||
        normalized.includes("404") ||
        normalized.includes("does not exist") ||
        normalized.includes("no such file");

      if (!missing) {
        return {
          ok: false,
          code: "INTERNAL",
          error: message,
        };
      }
    }

    const progressResult = await deleteListeningProgressByStoragePath(
      trimmed,
      user.id,
      client,
    );

    if (!progressResult.ok) {
      return {
        ok: false,
        code: "INTERNAL",
        error: progressResult.error,
      };
    }

    const membershipResult = await deleteCollectionMembershipsByStoragePath(
      trimmed,
      user.id,
      client,
    );

    if (!membershipResult.ok) {
      return {
        ok: false,
        code: "INTERNAL",
        error: membershipResult.error,
      };
    }

    const exportsResult = await deleteOwnedAudioExportsForDocument(
      trimmed,
      user.id,
      client,
    );

    if (!exportsResult.ok) {
      return {
        ok: false,
        code: "INTERNAL",
        error: exportsResult.error,
      };
    }

    const dbResult = await deleteDocumentsByStoragePath(
      trimmed,
      user.id,
      client,
    );

    if (!dbResult.ok) {
      return {
        ok: false,
        code: "INTERNAL",
        error: dbResult.error,
      };
    }

    forgetDocumentByStoragePath(trimmed);

    if (!storage.ok && dbResult.data.deletedCount === 0) {
      return {
        ok: false,
        code: "NOT_FOUND",
        error: "Document not found.",
      };
    }

    return {
      ok: true,
      storagePath: trimmed,
      removedFromStorage: storage.ok,
      deletedDocumentRows: dbResult.data.deletedCount,
    };
  } catch (error) {
    return {
      ok: false,
      code: "INTERNAL",
      error:
        error instanceof Error
          ? error.message
          : "Unable to delete this document.",
    };
  }
}
