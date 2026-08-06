/**
 * UTF-8 byte-aware text splitting for Google Gemini TTS.
 *
 * Why bytes (not chars): Cloud Text-to-Speech Gemini-TTS unary rejects
 * `input.text` / `input.prompt` when either exceeds 4000 UTF-8 bytes.
 * Multi-byte scripts (e.g. Bangla) can be ~3 bytes per character, so a
 * 4000-character slice can still blow the limit. We chunk at 3500 bytes
 * for margin and never truncate — the full document is preserved across chunks.
 */

/** Safety margin under Google's documented 4000-byte unary limit. */
export const GOOGLE_TTS_MAX_CHUNK_BYTES = 3500;

export function utf8ByteLength(text: string): number {
  return Buffer.byteLength(text, "utf8");
}

/**
 * Split text by UTF-8 byte length (never JS string length alone).
 * Soft boundaries: paragraph → sentence → whitespace → UTF-8-safe hard cut.
 * Preserves every character; `chunks.join("") === text`.
 */
export function splitTextByUtf8Bytes(
  text: string,
  maxBytes: number = GOOGLE_TTS_MAX_CHUNK_BYTES,
): string[] {
  if (maxBytes < 1) {
    throw new Error("maxBytes must be >= 1");
  }
  if (!text) {
    return [""];
  }
  if (utf8ByteLength(text) <= maxBytes) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (utf8ByteLength(remaining) <= maxBytes) {
      chunks.push(remaining);
      break;
    }

    const window = takeUtf8Prefix(remaining, maxBytes);
    const splitAt = findPreferredSplitIndex(window);

    let piece: string;
    if (splitAt > 0) {
      piece = window.slice(0, splitAt);
      remaining = remaining.slice(splitAt);
    } else {
      // No soft boundary in window — hard cut on a UTF-8 character boundary.
      piece = window;
      remaining = remaining.slice(window.length);
    }

    if (piece.length === 0) {
      // Safety: force at least one code point forward to avoid infinite loop.
      const forced =
        takeUtf8Prefix(remaining, Math.min(maxBytes, 4)) ||
        remaining.slice(0, 1);
      chunks.push(forced);
      remaining = remaining.slice(forced.length);
      continue;
    }

    chunks.push(piece);
  }

  return chunks;
}

/** Longest prefix of `text` whose UTF-8 encoding is <= maxBytes. */
function takeUtf8Prefix(text: string, maxBytes: number): string {
  if (utf8ByteLength(text) <= maxBytes) {
    return text;
  }

  let end = 0;
  let bytes = 0;
  for (const char of text) {
    const charBytes = utf8ByteLength(char);
    if (bytes + charBytes > maxBytes) {
      break;
    }
    bytes += charBytes;
    end += char.length;
  }
  return text.slice(0, end);
}

/**
 * Prefer the latest soft boundary inside `window` (exclusive end index into window).
 * Returns 0 when no usable boundary exists (caller hard-cuts).
 */
function findPreferredSplitIndex(window: string): number {
  if (!window) {
    return 0;
  }

  const paragraph = lastBoundaryIndex(window, /\n\n+/g);
  if (paragraph > 0) {
    return paragraph;
  }

  // Sentence end: Latin .!? and Bangla danda ।
  const sentence = lastBoundaryIndex(window, /[.!?।]["'")\]]*\s+/gu);
  if (sentence > 0) {
    return sentence;
  }

  const whitespace = lastBoundaryIndex(window, /\s+/g);
  if (whitespace > 0) {
    return whitespace;
  }

  return 0;
}

/** End index (after the match) of the last regex match that does not consume the whole window. */
function lastBoundaryIndex(window: string, pattern: RegExp): number {
  let last = 0;
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  for (const match of window.matchAll(re)) {
    const end = (match.index ?? 0) + match[0].length;
    // Keep at least something for the next chunk when possible.
    if (end > 0 && end < window.length) {
      last = end;
    }
  }
  return last;
}
