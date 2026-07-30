/**
 * Collections — organize owned library documents into reusable rooms.
 */

export { CollectionDetailWorkspace } from "./collection-detail-workspace";
export {
  addDocumentToCollection,
  createCollection,
  deleteCollection,
  getCollection,
  listCollectionMembers,
  listCollectionStoragePaths,
  listCollections,
  MAX_COLLECTION_NAME_LENGTH,
  moveDocumentBetweenCollections,
  removeDocumentFromCollection,
  renameCollection,
  toCollectionStoragePath,
  validateCollectionName,
} from "./collections-service";
export { deleteCollectionMembershipsByStoragePath } from "./delete-memberships";
export { CollectionsWorkspace } from "./collections-workspace";
export type {
  CollectionMember,
  CollectionSummary,
  CollectionsResult,
} from "./types";
export { useCollection } from "./use-collection";
export { useCollections } from "./use-collections";
