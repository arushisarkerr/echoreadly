import { YoutubeTranscript } from "youtube-transcript";

import type { DocumentParseResult } from "@/features/processing/parsers/types";
import type { ProcessingStage } from "@/features/processing/stages";
import { downloadYoutubeAudio } from "@/features/youtube/download-audio";
import { transcribeAudioWithWhisper } from "@/features/youtube/whisper-stt";
import { hasOpenAIKey } from "@/lib/ai/openai";

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

type StageReporter = (stage: ProcessingStage) => Promise<void> | void;

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
        duration: null as string | number | null,
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
      duration: null as string | number | null,
      publishDate: null as string | null,
    };
  } catch {
    return {
      videoId,
      title: `YouTube ${videoId}`,
      channel: null as string | null,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      duration: null as string | number | null,
      publishDate: null as string | null,
    };
  }
}

async function speechToTextFallback(
  videoId: string,
  onStage?: StageReporter,
): Promise<{
  text: string;
  language: string | null;
  durationSeconds: number | null;
  confidence: number | null;
  source: "whisper";
}> {
  if (!hasOpenAIKey()) {
    throw new Error(
      "No transcript is available for this video, and speech-to-text is not configured (OPENAI_API_KEY).",
    );
  }

  await onStage?.("downloading_audio");
  const audio = await downloadYoutubeAudio(videoId);

  await onStage?.("speech_to_text");
  const whisper = await transcribeAudioWithWhisper(audio.bytes);

  return {
    text: whisper.text,
    language: whisper.language,
    durationSeconds: whisper.durationSeconds ?? audio.durationSeconds,
    confidence: whisper.confidence,
    source: "whisper",
  };
}

/**
 * YouTube extractor — captions first, then audio download + Whisper STT.
 */
export async function parseYoutubeVideo(
  pageUrl: string,
  options?: { onStage?: StageReporter },
): Promise<DocumentParseResult> {
  const videoId = extractYoutubeVideoId(pageUrl);
  if (!videoId) {
    throw new Error("Enter a valid YouTube URL.");
  }

  const metadata = await fetchYoutubeMetadata(videoId, pageUrl);
  let text = "";
  let textSource: "transcript" | "whisper" = "transcript";
  let language: string | null = null;
  let confidence: number | null = null;
  let durationSeconds: number | null =
    typeof metadata.duration === "number" ? metadata.duration : null;

  await options?.onStage?.("extracting_transcript");

  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    text = segments
      .map((segment) => segment.text.trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    const stt = await speechToTextFallback(videoId, options?.onStage);
    text = stt.text;
    textSource = "whisper";
    language = stt.language;
    confidence = stt.confidence;
    durationSeconds = stt.durationSeconds;
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
      duration: durationSeconds,
      url: pageUrl,
      wordCount,
      textSource,
      originalLanguage: language,
      detectedLanguage: language,
      confidence,
      documentType: "YouTube",
    },
  };
}

/**
 * Parser adapter for stored YouTube JSON payloads.
 */
export async function parseYoutube(
  bytes: Uint8Array,
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

export async function parseYoutubeWithStages(
  bytes: Uint8Array,
  onStage?: StageReporter,
): Promise<DocumentParseResult> {
  const raw = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const payload = JSON.parse(raw) as { url?: string; videoId?: string };
  const url =
    payload.url ||
    (payload.videoId ? `https://www.youtube.com/watch?v=${payload.videoId}` : "");
  if (!url) {
    throw new Error("Invalid YouTube import payload.");
  }
  return parseYoutubeVideo(url, { onStage });
}
