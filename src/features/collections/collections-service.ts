/**
 * Collections persistence — browser Supabase client + RLS.
 * Membership references owned Storage paths; documents are not duplicated.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { PDFS_BUCKET } from "@/constants";
import { createClient } from "@/lib/supabase/client";
import {
  isOwnedPdfObjectKey,
  toPdfObjectKey,
} from "@/lib/storage";
import {
  normalizeStoragePath,
  uniqueStoragePathVariants,
} from "@/features/persistence/storage-path";

import type {
  CollectionDocumentRow,
  CollectionMember,
  CollectionRow,
  CollectionSummary,
  CollectionsResult,
} from "./types";

export { deleteCollectionMembershipsByStoragePath } from "./delete-memberships";
export const MAX_COLLECTION_NAME_LENGTH = 80;

function resolveClient(client?: SupabaseClient) {
  return client ?? createClient();
}

function displayNameFromStoragePath(storagePath: string): string {
  const key = toPdfObjectKey(storagePath);
  const segments = key.split("/");
  return segments[segments.length - 1] || "document.pdf";
}

/**
 * Canonical library-style path: `pdfs/{userId}/{file}.pdf`.
 */
export function toCollectionStoragePath(storagePath: string): string {
  const key = toPdfObjectKey(normalizeStoragePath(storagePath));
  return `${PDFS_BUCKET}/${key}`;
}

export function validateCollectionName(
  value: string,
): CollectionsResult<string> {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name) {
    return { ok: false, error: "Collection name is required." };
  }
  if (name.length > MAX_COLLECTION_NAME_LENGTH) {
    return {
      ok: false,
      error: `Name must be at most ${MAX_COLLECTION_NAME_LENGTH} characters.`,
    };
  }
  return { ok: true, data: name };
}

function rowToSummary(
  row: CollectionRow & {
    collection_documents?: Array<{ count: number }> | null;
  },
): CollectionSummary {
  const countEntry = row.collection_documents?.[0];
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    documentCount:
      typeof countEntry?.count === "number" ? countEntry.count : 0,
  };
}

function memberFromRow(row: CollectionDocumentRow): CollectionMember {
  return {
    id: row.id,
    collectionId: row.collection_id,
    storagePath: row.storage_path,
    addedAt: row.added_at,
    name: displayNameFromStoragePath(row.storage_path),
  };
}

async function requireUserId(
  client: SupabaseClient,
): Promise<CollectionsResult<string>> {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) {
    return { ok: false, error: "Authentication required." };
  }

  return { ok: true, data: user.id };
}

async function assertOwnedCollection(
  collectionId: string,
  userId: string,
  client: SupabaseClient,
): Promise<CollectionsResult<CollectionRow>> {
  const { data, error } = await client
    .from("collections")
    .select("*")
    .eq("id", collectionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: "Collection not found." };
  }

  return { ok: true, data: data as CollectionRow };
}

/**
 * List collections for the signed-in user with membership counts.
 */
export async function listCollections(
  client?: SupabaseClient,
): Promise<CollectionsResult<CollectionSummary[]>> {
  try {
    const supabase = resolveClient(client);
    const auth = await requireUserId(supabase);
    if (!auth.ok) {
      return auth;
    }

    const { data, error } = await supabase
      .from("collections")
      .select("id, user_id, name, created_at, updated_at, collection_documents(count)")
      .eq("user_id", auth.data)
      .order("updated_at", { ascending: false });

    if (error) {
      return { ok: false, error: error.message };
    }

    const items = ((data as Array<
      CollectionRow & {
        collection_documents?: Array<{ count: number }> | null;
      }
    >) ?? []).map(rowToSummary);

    return { ok: true, data: items };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to load collections.",
    };
  }
}

/**
 * Fetch one owned collection with document count.
 */
export async function getCollection(
  collectionId: string,
  client?: SupabaseClient,
): Promise<CollectionsResult<CollectionSummary>> {
  try {
    const supabase = resolveClient(client);
    const auth = await requireUserId(supabase);
    if (!auth.ok) {
      return auth;
    }

    const { data, error } = await supabase
      .from("collections")
      .select("id, user_id, name, created_at, updated_at, collection_documents(count)")
      .eq("id", collectionId)
      .eq("user_id", auth.data)
      .maybeSingle();

    if (error) {
      return { ok: false, error: error.message };
    }

    if (!data) {
      return { ok: false, error: "Collection not found." };
    }

    return {
      ok: true,
      data: rowToSummary(
        data as CollectionRow & {
          collection_documents?: Array<{ count: number }> | null;
        },
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to load collection.",
    };
  }
}

/**
 * Create a collection owned by the signed-in user.
 */
export async function createCollection(
  nameInput: string,
  client?: SupabaseClient,
): Promise<CollectionsResult<CollectionSummary>> {
  try {
    const name = validateCollectionName(nameInput);
    if (!name.ok) {
      return name;
    }

    const supabase = resolveClient(client);
    const auth = await requireUserId(supabase);
    if (!auth.ok) {
      return auth;
    }

    const { data, error } = await supabase
      .from("collections")
      .insert({
        user_id: auth.data,
        name: name.data,
      })
      .select("id, user_id, name, created_at, updated_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "A collection with that name already exists." };
      }
      return { ok: false, error: error.message };
    }

    return {
      ok: true,
      data: {
        id: (data as CollectionRow).id,
        name: (data as CollectionRow).name,
        createdAt: (data as CollectionRow).created_at,
        updatedAt: (data as CollectionRow).updated_at,
        documentCount: 0,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to create collection.",
    };
  }
}

/**
 * Rename an owned collection.
 */
export async function renameCollection(
  collectionId: string,
  nameInput: string,
  client?: SupabaseClient,
): Promise<CollectionsResult<CollectionSummary>> {
  try {
    const name = validateCollectionName(nameInput);
    if (!name.ok) {
      return name;
    }

    const supabase = resolveClient(client);
    const auth = await requireUserId(supabase);
    if (!auth.ok) {
      return auth;
    }

    const owned = await assertOwnedCollection(
      collectionId,
      auth.data,
      supabase,
    );
    if (!owned.ok) {
      return owned;
    }

    const { data, error } = await supabase
      .from("collections")
      .update({ name: name.data })
      .eq("id", collectionId)
      .eq("user_id", auth.data)
      .select("id, user_id, name, created_at, updated_at, collection_documents(count)")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "A collection with that name already exists." };
      }
      return { ok: false, error: error.message };
    }

    return {
      ok: true,
      data: rowToSummary(
        data as CollectionRow & {
          collection_documents?: Array<{ count: number }> | null;
        },
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to rename collection.",
    };
  }
}

/**
 * Delete an owned collection (memberships cascade).
 */
export async function deleteCollection(
  collectionId: string,
  client?: SupabaseClient,
): Promise<CollectionsResult<{ deleted: true }>> {
  try {
    const supabase = resolveClient(client);
    const auth = await requireUserId(supabase);
    if (!auth.ok) {
      return auth;
    }

    const owned = await assertOwnedCollection(
      collectionId,
      auth.data,
      supabase,
    );
    if (!owned.ok) {
      return owned;
    }

    const { error } = await supabase
      .from("collections")
      .delete()
      .eq("id", collectionId)
      .eq("user_id", auth.data);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data: { deleted: true } };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to delete collection.",
    };
  }
}

/**
 * List membership rows for an owned collection.
 */
export async function listCollectionMembers(
  collectionId: string,
  client?: SupabaseClient,
): Promise<CollectionsResult<CollectionMember[]>> {
  try {
    const supabase = resolveClient(client);
    const auth = await requireUserId(supabase);
    if (!auth.ok) {
      return auth;
    }

    const owned = await assertOwnedCollection(
      collectionId,
      auth.data,
      supabase,
    );
    if (!owned.ok) {
      return owned;
    }

    const { data, error } = await supabase
      .from("collection_documents")
      .select("*")
      .eq("collection_id", collectionId)
      .eq("user_id", auth.data)
      .order("added_at", { ascending: false });

    if (error) {
      return { ok: false, error: error.message };
    }

    return {
      ok: true,
      data: ((data as CollectionDocumentRow[]) ?? []).map(memberFromRow),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load collection documents.",
    };
  }
}

/**
 * Storage paths that belong to a collection (for Library filtering).
 */
export async function listCollectionStoragePaths(
  collectionId: string,
  client?: SupabaseClient,
): Promise<CollectionsResult<string[]>> {
  const members = await listCollectionMembers(collectionId, client);
  if (!members.ok) {
    return members;
  }
  return {
    ok: true,
    data: members.data.map((member) => member.storagePath),
  };
}

/**
 * Add an owned Storage document to an owned collection.
 */
export async function addDocumentToCollection(
  collectionId: string,
  storagePathInput: string,
  client?: SupabaseClient,
): Promise<CollectionsResult<CollectionMember>> {
  try {
    const supabase = resolveClient(client);
    const auth = await requireUserId(supabase);
    if (!auth.ok) {
      return auth;
    }

    const owned = await assertOwnedCollection(
      collectionId,
      auth.data,
      supabase,
    );
    if (!owned.ok) {
      return owned;
    }

    const storagePath = toCollectionStoragePath(storagePathInput);
    const objectKey = toPdfObjectKey(storagePath);
    if (!isOwnedPdfObjectKey(objectKey, auth.data)) {
      return { ok: false, error: "Document not found." };
    }

    const { data, error } = await supabase
      .from("collection_documents")
      .upsert(
        {
          user_id: auth.data,
          collection_id: collectionId,
          storage_path: storagePath,
        },
        { onConflict: "collection_id,storage_path" },
      )
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    await supabase
      .from("collections")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", collectionId)
      .eq("user_id", auth.data);

    return { ok: true, data: memberFromRow(data as CollectionDocumentRow) };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to add document to collection.",
    };
  }
}

/**
 * Remove a document membership from an owned collection.
 */
export async function removeDocumentFromCollection(
  collectionId: string,
  storagePathInput: string,
  client?: SupabaseClient,
): Promise<CollectionsResult<{ removed: true }>> {
  try {
    const supabase = resolveClient(client);
    const auth = await requireUserId(supabase);
    if (!auth.ok) {
      return auth;
    }

    const owned = await assertOwnedCollection(
      collectionId,
      auth.data,
      supabase,
    );
    if (!owned.ok) {
      return owned;
    }

    const paths = uniqueStoragePathVariants(
      toCollectionStoragePath(storagePathInput),
    );

    const { error } = await supabase
      .from("collection_documents")
      .delete()
      .eq("collection_id", collectionId)
      .eq("user_id", auth.data)
      .in("storage_path", paths);

    if (error) {
      return { ok: false, error: error.message };
    }

    await supabase
      .from("collections")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", collectionId)
      .eq("user_id", auth.data);

    return { ok: true, data: { removed: true } };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to remove document from collection.",
    };
  }
}

/**
 * Move a document from one owned collection to another.
 */
export async function moveDocumentBetweenCollections(input: {
  fromCollectionId: string;
  toCollectionId: string;
  storagePath: string;
  client?: SupabaseClient;
}): Promise<CollectionsResult<CollectionMember>> {
  if (input.fromCollectionId === input.toCollectionId) {
    return { ok: false, error: "Choose a different collection." };
  }

  const added = await addDocumentToCollection(
    input.toCollectionId,
    input.storagePath,
    input.client,
  );
  if (!added.ok) {
    return added;
  }

  const removed = await removeDocumentFromCollection(
    input.fromCollectionId,
    input.storagePath,
    input.client,
  );
  if (!removed.ok) {
    return removed;
  }

  return added;
}
