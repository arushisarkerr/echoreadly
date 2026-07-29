/**
 * SHA-256 hashing for PDF bytes.
 * Used to reuse processing when the same document is uploaded again.
 */

import { createHash } from "node:crypto";

/**
 * Generate a hex-encoded SHA-256 hash of raw PDF bytes.
 */
export function hashDocumentBytes(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * True when a value looks like a SHA-256 hex digest.
 */
export function isDocumentHash(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}
