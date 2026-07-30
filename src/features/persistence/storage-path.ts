/**
 * Normalize and expand storage path variants used across persistence tables.
 */

export function normalizeStoragePath(storagePath: string): string {
  return storagePath.replace(/^\/+/, "").trim();
}

/**
 * Return path variants so lookups work with or without a `pdfs/` prefix.
 */
export function uniqueStoragePathVariants(storagePath: string): string[] {
  const trimmed = normalizeStoragePath(storagePath);
  const variants = new Set<string>([trimmed]);

  if (trimmed.startsWith("pdfs/")) {
    variants.add(trimmed.slice("pdfs/".length));
  } else if (trimmed.length > 0) {
    variants.add(`pdfs/${trimmed}`);
  }

  return Array.from(variants).filter(Boolean);
}
