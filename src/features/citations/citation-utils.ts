/**
 * Helpers for normalizing and formatting page citations.
 */

/**
 * Keep only positive integers, unique and sorted ascending.
 * When `allowedPages` is provided, drop any page not in that set
 * (prevents invented page numbers).
 */
export function normalizePages(
  pages: unknown,
  allowedPages?: ReadonlySet<number>,
): number[] {
  if (!Array.isArray(pages)) {
    return [];
  }

  const unique = new Set<number>();

  for (const value of pages) {
    const page =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number(value)
          : NaN;

    if (!Number.isInteger(page) || page < 1) {
      continue;
    }

    if (allowedPages && !allowedPages.has(page)) {
      continue;
    }

    unique.add(page);
  }

  return Array.from(unique).sort((a, b) => a - b);
}

/**
 * Collect the set of page numbers actually present in source chunks.
 */
export function collectAllowedPages(
  pageNumbers: Iterable<number>,
): Set<number> {
  const allowed = new Set<number>();

  for (const page of pageNumbers) {
    if (Number.isInteger(page) && page >= 1) {
      allowed.add(page);
    }
  }

  return allowed;
}

type PageRange = { start: number; end: number };

function toRanges(pages: number[]): PageRange[] {
  if (pages.length === 0) {
    return [];
  }

  const ranges: PageRange[] = [];
  let start = pages[0];
  let end = pages[0];

  for (let i = 1; i < pages.length; i += 1) {
    const page = pages[i];

    if (page === end + 1) {
      end = page;
      continue;
    }

    ranges.push({ start, end });
    start = page;
    end = page;
  }

  ranges.push({ start, end });
  return ranges;
}

function formatRange(range: PageRange): string {
  if (range.start === range.end) {
    return String(range.start);
  }

  return `${range.start}–${range.end}`;
}

/**
 * Format page numbers for display:
 * - Page 3
 * - Pages 5–7
 * - Pages 2, 8
 * - Pages 2, 5–7, 9
 */
export function formatPageCitations(pages: number[]): string | null {
  const normalized = normalizePages(pages);

  if (normalized.length === 0) {
    return null;
  }

  const ranges = toRanges(normalized);
  const labels = ranges.map(formatRange);

  if (normalized.length === 1) {
    return `Page ${labels[0]}`;
  }

  return `Pages ${labels.join(", ")}`;
}

/**
 * Flatten unique pages from cited sections.
 */
export function flattenSectionPages(
  sections: Array<{ pages: number[] }>,
): number[] {
  const all: number[] = [];

  for (const section of sections) {
    all.push(...section.pages);
  }

  return normalizePages(all);
}
