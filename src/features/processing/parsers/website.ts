import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

import type { DocumentParseResult } from "@/features/processing/parsers/types";

function metaContent(document: Document, selectors: string[]): string | null {
  for (const selector of selectors) {
    const node = document.querySelector(selector);
    const content =
      node?.getAttribute("content") ||
      node?.getAttribute("value") ||
      node?.textContent;
    if (content && content.trim()) {
      return content.trim();
    }
  }
  return null;
}

function estimateReadingTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 230));
}

/**
 * Website extractor — Readability main content + metadata.
 */
export async function parseWebsiteHtml(
  html: string,
  pageUrl: string,
): Promise<DocumentParseResult> {
  const { document } = parseHTML(html);
  const canonical =
    document.querySelector("link[rel='canonical']")?.getAttribute("href") ||
    metaContent(document, ["meta[property='og:url']"]) ||
    pageUrl;

  const reader = new Readability(document);
  const article = reader.parse();
  const title =
    article?.title?.trim() ||
    metaContent(document, ["meta[property='og:title']", "title"]) ||
    "Website article";

  const text = (article?.textContent || "").replace(/\s+\n/g, "\n").trim();
  if (!text) {
    throw new Error("Unable to extract main content from that page.");
  }

  const description =
    metaContent(document, [
      "meta[name='description']",
      "meta[property='og:description']",
    ]) || article?.excerpt || null;
  const siteName =
    metaContent(document, ["meta[property='og:site_name']"]) ||
    (() => {
      try {
        return new URL(canonical).hostname;
      } catch {
        return null;
      }
    })();
  const author =
    metaContent(document, [
      "meta[name='author']",
      "meta[property='article:author']",
    ]) || article?.byline || null;
  const publishDate =
    metaContent(document, [
      "meta[property='article:published_time']",
      "meta[name='publish-date']",
      "time[datetime]",
    ]) || null;

  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return {
    text,
    pageCount: Math.max(1, Math.ceil(wordCount / 3000)),
    title,
    metadata: {
      url: canonical,
      title,
      description,
      siteName,
      author,
      publishDate,
      readingTimeMinutes: estimateReadingTime(wordCount),
      wordCount,
    },
  };
}

/**
 * Parser adapter for stored HTML bytes in the shared processing pipeline.
 */
export async function parseWebsite(
  bytes: Uint8Array,
  filename: string,
): Promise<DocumentParseResult> {
  const html = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const fallbackUrl = filename.startsWith("http") ? filename : "https://example.com";
  return parseWebsiteHtml(html, fallbackUrl);
}
