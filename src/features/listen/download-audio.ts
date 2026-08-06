/**
 * Listen-page helpers for forced MP3 download (signed URLs are cross-origin).
 */

const ILLEGAL_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

/** YYYY-MM-DD FirstWord SecondWord.ext — max 60 chars before extension. */
export function buildAudioDownloadFilename(
  sourceText: string,
  extension = "mp3",
): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const date = `${yyyy}-${mm}-${dd}`;

  const words = sourceText
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.replace(ILLEGAL_FILENAME_CHARS, "").trim())
    .filter(Boolean);

  const wordPart = words.join(" ").replace(/\s+/g, " ").trim();
  let base = wordPart ? `${date} ${wordPart}` : date;
  base = base.replace(ILLEGAL_FILENAME_CHARS, "").replace(/\s+/g, " ").trim();
  if (base.length > 60) {
    base = base.slice(0, 60).trim();
  }
  const ext = extension.replace(/^\./, "") || "mp3";
  return `${base}.${ext}`;
}

/**
 * Fetch audio as a Blob and trigger a same-tab download.
 * Cross-origin `download` on <a href> is ignored by browsers for signed URLs.
 */
export async function downloadAudioFromUrl(
  url: string,
  filename: string,
): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Unable to download audio.");
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
