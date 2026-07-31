/**
 * Shared text chunking used by every import source after extraction.
 *
 * `pageNumber` is required by live `document_chunks.page_number` (NOT NULL, >= 1).
 * Paginated sources (PDF, OCR PDF, EPUB spine) pass real page numbers.
 * Non-paginated sources (YouTube, Website, TXT, DOCX, image OCR, future audio)
 * use page 1 as the single logical stream.
 */

export type TextChunk = {
  chunkIndex: number;
  pageNumber: number;
  text: string;
  characterCount: number;
};

export type PageText = {
  pageNumber: number;
  text: string;
};

const DEFAULT_CHUNK_SIZE = 1800;
const DEFAULT_OVERLAP = 200;

function normalizePageNumber(pageNumber: number | undefined): number {
  if (typeof pageNumber === "number" && Number.isInteger(pageNumber) && pageNumber >= 1) {
    return pageNumber;
  }
  return 1;
}

/**
 * Split plain text into overlapping chunks for one logical page/stream.
 */
export function chunkPlainText(
  input: string,
  options?: { chunkSize?: number; overlap?: number; pageNumber?: number },
): TextChunk[] {
  const text = input.replace(/\r\n/g, "\n").trim();
  if (!text) {
    return [];
  }

  const pageNumber = normalizePageNumber(options?.pageNumber);
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
        pageNumber,
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

/**
 * Chunk each page separately, preserving page_number for PDF/OCR/EPUB.
 * Chunk indexes are global across the document (0..n-1).
 */
export function chunkPages(
  pages: PageText[],
  options?: { chunkSize?: number; overlap?: number },
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let index = 0;

  for (const page of pages) {
    const pageNumber = normalizePageNumber(page.pageNumber);
    const pageChunks = chunkPlainText(page.text, {
      ...options,
      pageNumber,
    });
    for (const chunk of pageChunks) {
      chunks.push({
        ...chunk,
        chunkIndex: index,
      });
      index += 1;
    }
  }

  return chunks;
}

/**
 * Prefer per-page chunking when pages are available; otherwise page_number = 1.
 */
export function chunkParsedText(input: {
  text: string;
  pages?: PageText[] | null;
}): TextChunk[] {
  if (input.pages && input.pages.length > 0) {
    return chunkPages(input.pages);
  }
  return chunkPlainText(input.text, { pageNumber: 1 });
}
