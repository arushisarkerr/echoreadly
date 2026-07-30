/**
 * Collections feature types.
 */

export type CollectionRow = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type CollectionDocumentRow = {
  id: string;
  user_id: string;
  collection_id: string;
  storage_path: string;
  added_at: string;
};

export type CollectionSummary = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  documentCount: number;
};

export type CollectionMember = {
  id: string;
  collectionId: string;
  storagePath: string;
  addedAt: string;
  /** Basename for display when library metadata is unavailable. */
  name: string;
};

export type CollectionsResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
