/**
 * User ownership helpers for private `pdfs` Storage objects.
 * Object keys must be `{userId}/{fileId}.pdf`.
 */

/**
 * True when the object key is owned by `userId` (first path segment).
 * Rejects path traversal and nested keys beyond the user folder.
 */
export function isOwnedPdfObjectKey(objectKey: string, userId: string): boolean {
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

  return fileId.toLowerCase().endsWith(".pdf");
}

/** Storage folder prefix for a user's PDFs (equals `userId`). */
export function userPdfFolderPrefix(userId: string): string {
  return userId;
}
