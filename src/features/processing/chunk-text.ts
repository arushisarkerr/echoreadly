/**
 * Shared text chunking used by every import source after extraction.
 */

export type TextChunk = {
  chunkIndex: number;
  text: string;
  characterCount: number;
};

const DEFAULT_CHUNK_SIZE = 1800;
const DEFAULT_OVERLAP = 200;

/**
 * Split plain text into overlapping chunks for the shared processing pipeline.
 */
export function chunkPlainText(
  input: string,
  options?: { chunkSize?: number; overlap?: number },
): TextChunk[] {
  const text = input.replace(/\r\n/g, "\n").trim();
  if (!text) {
    return [];
  }

  const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = Math.min(options?.overlap ?? DEFAULT_OVERLAP, chunkSize - 1);
  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);
    if (end < text.length) {
      const slice = text.slice(start, end);
      const breakAt = Math.max(
        slice.lastIndexOf("\n\n"),
        slice.lastIndexOf(". "),
        slice.lastIndexOf(" "),
      );
      if (breakAt > chunkSize * 0.4) {
        end = start + breakAt + 1;
      }
    }

    const piece = text.slice(start, end).trim();
    if (piece) {
      chunks.push({
        chunkIndex: index,
        text: piece,
        characterCount: piece.length,
      });
      index += 1;
    }

    if (end >= text.length) {
      break;
    }
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}
