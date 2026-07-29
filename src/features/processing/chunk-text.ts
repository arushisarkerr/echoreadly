/**
 * Logical text chunking for extracted PDF content.
 * No AI, embeddings, or OCR — plain text splitting only.
 */

export const CHUNK_MIN_CHARS = 800;
export const CHUNK_TARGET_CHARS = 1000;
export const CHUNK_MAX_CHARS = 1200;

export type DocumentChunk = {
  id: string;
  pageNumber: number;
  chunkIndex: number;
  text: string;
  characterCount: number;
};

export type ChunkTextOptions = {
  /** Soft lower bound before preferring a flush (default 800). */
  minChars?: number;
  /** Preferred chunk size (default 1000). */
  targetChars?: number;
  /** Hard upper bound when possible (default 1200). */
  maxChars?: number;
  /** Optional prefix for stable chunk ids. */
  idPrefix?: string;
};

type ResolvedChunkOptions = {
  minChars: number;
  targetChars: number;
  maxChars: number;
  idPrefix: string;
};

function resolveOptions(options?: ChunkTextOptions): ResolvedChunkOptions {
  const minChars = options?.minChars ?? CHUNK_MIN_CHARS;
  const targetChars = options?.targetChars ?? CHUNK_TARGET_CHARS;
  const maxChars = options?.maxChars ?? CHUNK_MAX_CHARS;

  return {
    minChars,
    targetChars,
    maxChars: Math.max(maxChars, minChars, targetChars),
    idPrefix: options?.idPrefix ?? "chunk",
  };
}

function createChunkId(
  idPrefix: string,
  pageNumber: number,
  chunkIndex: number,
): string {
  return `${idPrefix}_p${pageNumber}_${chunkIndex}`;
}

function createChunk(
  idPrefix: string,
  pageNumber: number,
  chunkIndex: number,
  text: string,
): DocumentChunk {
  const normalized = text.trim();

  return {
    id: createChunkId(idPrefix, pageNumber, chunkIndex),
    pageNumber,
    chunkIndex,
    text: normalized,
    characterCount: normalized.length,
  };
}

/**
 * Split page text into paragraphs, preferring blank-line boundaries.
 */
export function splitIntoParagraphs(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return [];
  }

  const byBlankLine = normalized
    .split(/\n\s*\n+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (byBlankLine.length > 1) {
    return byBlankLine;
  }

  // Fall back to single newlines when the page has no blank-line paragraphs.
  return normalized
    .split(/\n+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/**
 * Find a word-safe split index at or before `maxLength`.
 * Returns -1 when no whitespace boundary exists in range.
 */
function findWordBoundary(text: string, maxLength: number): number {
  if (maxLength >= text.length) {
    return text.length;
  }

  const window = text.slice(0, maxLength + 1);
  const lastSpace = window.lastIndexOf(" ");
  const lastNewline = window.lastIndexOf("\n");
  const boundary = Math.max(lastSpace, lastNewline);

  if (boundary <= 0) {
    return -1;
  }

  return boundary;
}

/**
 * Split an oversized segment on word boundaries without mid-word cuts.
 * A single token longer than maxChars is kept intact.
 */
function splitOversizedSegment(
  segment: string,
  maxChars: number,
): string[] {
  const trimmed = segment.trim();

  if (!trimmed) {
    return [];
  }

  if (trimmed.length <= maxChars) {
    return [trimmed];
  }

  const parts: string[] = [];
  let remaining = trimmed;

  while (remaining.length > maxChars) {
    const boundary = findWordBoundary(remaining, maxChars);

    if (boundary === -1) {
      // Unbreakable token — keep whole word (may exceed maxChars).
      const nextSpace = remaining.search(/\s/);

      if (nextSpace === -1) {
        parts.push(remaining);
        remaining = "";
        break;
      }

      parts.push(remaining.slice(0, nextSpace).trim());
      remaining = remaining.slice(nextSpace).trim();
      continue;
    }

    parts.push(remaining.slice(0, boundary).trim());
    remaining = remaining.slice(boundary).trim();
  }

  if (remaining.length > 0) {
    parts.push(remaining);
  }

  return parts.filter((part) => part.length > 0);
}

function appendWithSeparator(current: string, next: string): string {
  if (!current) {
    return next;
  }

  return `${current}\n\n${next}`;
}

/**
 * Chunk a single page's text while preserving the page number on every chunk.
 */
export function chunkPageText(
  pageNumber: number,
  pageText: string,
  startingChunkIndex = 0,
  options?: ChunkTextOptions,
): DocumentChunk[] {
  const resolved = resolveOptions(options);
  const paragraphs = splitIntoParagraphs(pageText);

  if (paragraphs.length === 0) {
    return [];
  }

  const chunks: DocumentChunk[] = [];
  let chunkIndex = startingChunkIndex;
  let buffer = "";

  const flush = () => {
    if (!buffer.trim()) {
      buffer = "";
      return;
    }

    chunks.push(
      createChunk(resolved.idPrefix, pageNumber, chunkIndex, buffer),
    );
    chunkIndex += 1;
    buffer = "";
  };

  for (const paragraph of paragraphs) {
    const pieces = splitOversizedSegment(paragraph, resolved.maxChars);

    for (const piece of pieces) {
      const candidate = appendWithSeparator(buffer, piece);

      if (!buffer) {
        buffer = piece;
        continue;
      }

      if (candidate.length <= resolved.maxChars) {
        buffer = candidate;
        continue;
      }

      // Prefer flushing once we are in the target band.
      if (buffer.length >= resolved.minChars) {
        flush();
        buffer = piece;
        continue;
      }

      // Buffer is still small but next piece won't fit — flush early.
      flush();
      buffer = piece;
    }

    // Soft flush near target when the buffer is already in range.
    if (buffer.length >= resolved.targetChars) {
      flush();
    }
  }

  flush();
  return chunks;
}

/**
 * Chunk multiple pages, assigning a global chunkIndex across the document.
 */
export function chunkPages(
  pages: Array<{ pageNumber: number; pageText: string }>,
  options?: ChunkTextOptions,
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let nextIndex = 0;

  for (const page of pages) {
    const pageChunks = chunkPageText(
      page.pageNumber,
      page.pageText,
      nextIndex,
      options,
    );

    chunks.push(...pageChunks);
    nextIndex += pageChunks.length;
  }

  return chunks;
}
