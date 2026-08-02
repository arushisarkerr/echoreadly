/**
 * Temporary development logging for translation requests only.
 * Never logs secrets. Remove once debugging is complete.
 */

const PREFIX = "[AI translation debug]";

export function isTranslationDebugEnabled(
  feature: string,
): boolean {
  return feature === "translation";
}

/** Convert internal key id `openai:key_1` → `OPENAI_KEY_1` (index only). */
export function formatKeyIndexLabel(
  providerId: string,
  keyId: string,
): string {
  const match = /:key_(\d+)$/i.exec(keyId);
  const index = match?.[1] ?? "?";
  return `${providerId.toUpperCase()}_KEY_${index}`;
}

export function logTranslationDebug(
  message: string,
  details?: Record<string, unknown>,
): void {
  if (details) {
    console.info(PREFIX, message, details);
    return;
  }
  console.info(PREFIX, message);
}
