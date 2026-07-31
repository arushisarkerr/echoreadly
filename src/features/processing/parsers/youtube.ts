import { YoutubeTranscript } from "youtube-transcript";

import type { DocumentParseResult } from "@/features/processing/parsers/types";

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

export function extractYoutubeVideoId(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) {
    return null;
  }

  if (host === "youtu.be" || host === "www.youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id || null;
  }

  const fromQuery = url.searchParams.get("v");
  if (fromQuery) {
    return fromQuery;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") {
    return parts[1] || null;
  }

  return null;
}

export function isYoutubeUrl(rawUrl: string): boolean {
  return Boolean(extractYoutubeVideoId(rawUrl));
}

type YoutubeOEmbed = {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
};

async function fetchYoutubeMetadata(videoId: string, pageUrl: string) {
  const oembed = new URL("https://www.youtube.com/oembed");
  oembed.searchParams.set("url", pageUrl);
  oembed.searchParams.set("format", "json");

  try {
    const response = await fetch(oembed.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      return {
        videoId,
        title: `YouTube ${videoId}`,
        channel: null as string | null,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        duration: null as string | null,
        publishDate: null as string | null,
      };
    }
    const payload = (await response.json()) as YoutubeOEmbed;
    return {
      videoId,
      title: payload.title?.trim() || `YouTube ${videoId}`,
      channel: payload.author_name?.trim() || null,
      thumbnail:
        payload.thumbnail_url ||
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      duration: null as string | null,
      publishDate: null as string | null,
    };
  } catch {
    return {
      videoId,
      title: `YouTube ${videoId}`,
      channel: null as string | null,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      duration: null as string | null,
      publishDate: null as string | null,
    };
  }
}

/**
 * Attempt Whisper STT when a transcript is unavailable and OPENAI_API_KEY is set.
 * Audio download from YouTube is best-effort; failures surface a clear error.
 */
async function speechToTextFallback(videoId: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "No transcript is available for this video, and speech-to-text is not configured.",
    );
  }

  // Placeholder for audio download + Whisper. Without a stable YouTube audio
  // downloader in this environment, fail clearly rather than invent content.
  void videoId;
  throw new Error(
    "No caption transcript is available for this video. Speech-to-text fallback could not download audio.",
  );
}

/**
 * YouTube extractor — captions first, optional STT fallback.
 */
export async function parseYoutubeVideo(
  pageUrl: string,
): Promise<DocumentParseResult> {
  const videoId = extractYoutubeVideoId(pageUrl);
  if (!videoId) {
    throw new Error("Enter a valid YouTube URL.");
  }

  const metadata = await fetchYoutubeMetadata(videoId, pageUrl);
  let text = "";

  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    text = segments
      .map((segment) => segment.text.trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    text = await speechToTextFallback(videoId);
  }

  if (!text) {
    throw new Error("Unable to extract spoken content from this YouTube video.");
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return {
    text,
    pageCount: Math.max(1, Math.ceil(wordCount / 3000)),
    title: metadata.title,
    metadata: {
      ...metadata,
      url: pageUrl,
      wordCount,
    },
  };
}

/**
 * Parser adapter for stored YouTube JSON payloads.
 */
export async function parseYoutube(
  bytes: Uint8Array,
  _filename: string,
): Promise<DocumentParseResult> {
  const raw = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const payload = JSON.parse(raw) as { url?: string; videoId?: string };
  const url =
    payload.url ||
    (payload.videoId ? `https://www.youtube.com/watch?v=${payload.videoId}` : "");
  if (!url) {
    throw new Error("Invalid YouTube import payload.");
  }
  return parseYoutubeVideo(url);
}
