import JSZip from "jszip";

import type { DocumentParseResult } from "@/features/processing/parsers/types";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveZipPath(base: string, relative: string): string {
  const cleaned = relative.replace(/^\//, "");
  if (!base.includes("/")) {
    return cleaned;
  }
  const dir = base.slice(0, base.lastIndexOf("/") + 1);
  const parts = `${dir}${cleaned}`.split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join("/");
}

/**
 * EPUB parser — unzip package, walk spine HTML, strip tags to plain text.
 */
export async function parseEpub(
  bytes: Uint8Array,
  filename: string,
): Promise<DocumentParseResult> {
  void filename;
  const zip = await JSZip.loadAsync(bytes);
  const containerXml = await zip.file("META-INF/container.xml")?.async("string");
  if (!containerXml) {
    throw new Error("Invalid EPUB: missing container.xml.");
  }

  const rootMatch = containerXml.match(/full-path=["']([^"']+)["']/i);
  const opfPath = rootMatch?.[1];
  if (!opfPath) {
    throw new Error("Invalid EPUB: missing package document path.");
  }

  const opfXml = await zip.file(opfPath)?.async("string");
  if (!opfXml) {
    throw new Error("Invalid EPUB: missing package document.");
  }

  const titleMatch = opfXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
  const title = titleMatch?.[1]?.trim() || null;

  const manifest = new Map<string, string>();
  const itemRegex =
    /<item\b[^>]*\bid=["']([^"']+)["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi;
  const itemRegexAlt =
    /<item\b[^>]*\bhref=["']([^"']+)["'][^>]*\bid=["']([^"']+)["'][^>]*>/gi;

  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(opfXml)) !== null) {
    manifest.set(match[1], match[2]);
  }
  while ((match = itemRegexAlt.exec(opfXml)) !== null) {
    manifest.set(match[2], match[1]);
  }

  const spineIds: string[] = [];
  const spineRegex = /<itemref\b[^>]*\bidref=["']([^"']+)["'][^>]*>/gi;
  while ((match = spineRegex.exec(opfXml)) !== null) {
    spineIds.push(match[1]);
  }

  const pages: string[] = [];
  for (const id of spineIds) {
    const href = manifest.get(id);
    if (!href) {
      continue;
    }
    const path = resolveZipPath(opfPath, href);
    const html = await zip.file(path)?.async("string");
    if (!html) {
      continue;
    }
    const text = stripHtml(html);
    if (text) {
      pages.push(text);
    }
  }

  // Fallback: any HTML/XHTML in the archive if spine was empty.
  if (pages.length === 0) {
    const htmlFiles = Object.keys(zip.files).filter((name) =>
      /\.(xhtml|html|htm)$/i.test(name),
    );
    for (const name of htmlFiles) {
      const html = await zip.file(name)?.async("string");
      if (!html) {
        continue;
      }
      const text = stripHtml(html);
      if (text) {
        pages.push(text);
      }
    }
  }

  return {
    text: pages.join("\n\n").trim(),
    pageCount: pages.length || null,
    title,
  };
}
