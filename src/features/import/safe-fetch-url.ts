/**
 * SSRF-safe URL validation for Website / YouTube import.
 */

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
]);

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) {
    return true;
  }
  if (a === 169 && b === 254) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  return false;
}

export type SafeUrlResult =
  | { ok: true; url: URL }
  | { ok: false; message: string };

/**
 * Validate a user-supplied http(s) URL before fetching.
 */
export function validateSafeHttpUrl(raw: string): SafeUrlResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, message: "Enter a URL to import." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, message: "Enter a valid URL." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, message: "Only http and https URLs are supported." };
  }

  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".local") || isPrivateIpv4(host)) {
    return { ok: false, message: "That URL cannot be imported." };
  }

  return { ok: true, url: parsed };
}

/**
 * Fetch HTML/text with a timeout and size cap.
 */
export async function fetchSafeUrl(
  url: URL,
  options?: { timeoutMs?: number; maxBytes?: number },
): Promise<{ body: string; finalUrl: string; contentType: string }> {
  const timeoutMs = options?.timeoutMs ?? 20_000;
  const maxBytes = options?.maxBytes ?? 2_000_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "EchoReadlyImporter/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Unable to fetch URL (${response.status}).`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
      throw new Error("Remote page is too large to import.");
    }

    const body = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    return {
      body,
      finalUrl: response.url || url.toString(),
      contentType,
    };
  } finally {
    clearTimeout(timer);
  }
}
