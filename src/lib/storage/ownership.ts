/**
 * User ownership helpers for private document Storage objects.
 * Object keys must be `{userId}/{fileId}.{ext}` for supported formats.
 */

import { isSupportedDocumentExtension } from "@/constants";

/**
 * True when the object key is owned by `userId` (first path segment)
 * and uses a supported document extension.
 */
export function isOwnedDocumentObjectKey(
  objectKey: string,
  userId: string,
): boolean {
  if (!userId || !objectKey) {
    return false;
  }

  if (
    objectKey.includes("..") ||
    objectKey.includes("\0") ||
    objectKey.startsWith("/")
  ) {
    return false;
  }

  const prefix = `${userId}/`;
  if (!objectKey.startsWith(prefix)) {
    return false;
  }

  const fileId = objectKey.slice(prefix.length);
  if (!fileId || fileId.includes("/")) {
    return false;
  }

  return isSupportedDocumentExtension(fileId);
}

/**
 * @deprecated Prefer {@link isOwnedDocumentObjectKey}.
 * Kept for existing call sites; now allows all supported document extensions.
 */
export function isOwnedPdfObjectKey(
  objectKey: string,
  userId: string,
): boolean {
  return isOwnedDocumentObjectKey(objectKey, userId);
}

/** Storage folder prefix for a user's documents (equals `userId`). */
export function userPdfFolderPrefix(userId: string): string {
  return userId;
}
