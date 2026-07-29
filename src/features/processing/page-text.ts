/**
 * Per-page text structures for extracted PDF content.
 */

export type PageText = {
  pageNumber: number;
  pageText: string;
};

/**
 * Build ordered page text entries from an array of page strings.
 */
export function createPageTexts(pages: string[]): PageText[] {
  return pages.map((pageText, index) => ({
    pageNumber: index + 1,
    pageText,
  }));
}

/**
 * Join page texts into a single document string with page breaks.
 */
export function joinPageTexts(pages: PageText[]): string {
  return pages
    .map((page) => page.pageText.trim())
    .filter((text) => text.length > 0)
    .join("\n\n");
}

/**
 * True when every page is empty or whitespace-only.
 */
export function isEmptyPageTextSet(pages: PageText[]): boolean {
  return pages.every((page) => page.pageText.trim().length === 0);
}
