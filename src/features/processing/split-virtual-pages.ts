/**
 * Split plain text into virtual pages for the shared document model.
 */

import { VIRTUAL_PAGE_CHAR_TARGET } from "@/constants";

/**
 * Split text into page-sized chunks on paragraph / sentence boundaries when possible.
 */
export function splitTextIntoVirtualPages(
  text: string,
  targetChars = VIRTUAL_PAGE_CHAR_TARGET,
): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  if (normalized.length <= targetChars) {
    return [normalized];
  }

  const paragraphs = normalized.split(/\n{2,}/);
  const pages: string[] = [];
  let current = "";

  function flush() {
    const trimmed = current.trim();
    if (trimmed) {
      pages.push(trimmed);
    }
    current = "";
  }

  for (const paragraph of paragraphs) {
    const block = paragraph.trim();
    if (!block) {
      continue;
    }

    if (!current) {
      current = block;
      continue;
    }

    if (`${current}\n\n${block}`.length <= targetChars) {
      current = `${current}\n\n${block}`;
      continue;
    }

    flush();

    if (block.length <= targetChars) {
      current = block;
      continue;
    }

    // Oversized paragraph — hard-split by characters on whitespace when possible.
    let remaining = block;
    while (remaining.length > targetChars) {
      let cut = remaining.lastIndexOf(" ", targetChars);
      if (cut < targetChars * 0.5) {
        cut = targetChars;
      }
      pages.push(remaining.slice(0, cut).trim());
      remaining = remaining.slice(cut).trim();
    }
    current = remaining;
  }

  flush();
  return pages.length > 0 ? pages : [normalized];
}
