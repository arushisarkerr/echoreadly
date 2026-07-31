import { Innertube } from "youtubei.js";

/**
 * Download audio-only bytes for a YouTube video (no video stream).
 */
export async function downloadYoutubeAudio(
  videoId: string,
): Promise<{ bytes: Uint8Array; mimeType: string; durationSeconds: number | null }> {
  try {
    const youtube = await Innertube.create();
    const info = await youtube.getBasicInfo(videoId);
    const playability = info.playability_status;

    if (playability?.status && playability.status !== "OK") {
      const reason = playability.reason || playability.status;
      const lower = String(reason).toLowerCase();
      if (lower.includes("private")) {
        throw new Error("This YouTube video is private and cannot be imported.");
      }
      if (lower.includes("unavailable") || lower.includes("removed")) {
        throw new Error("This YouTube video is unavailable or deleted.");
      }
      if (lower.includes("age")) {
        throw new Error("This YouTube video is age-restricted and cannot be imported.");
      }
      throw new Error(`Unable to access this YouTube video (${reason}).`);
    }

    const durationSeconds =
      typeof info.basic_info?.duration === "number"
        ? info.basic_info.duration
        : null;

    const stream = await youtube.download(videoId, {
      type: "audio",
      quality: "bestefficiency",
      format: "any",
    });

    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();
    let total = 0;
    const maxBytes = 80 * 1024 * 1024;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        total += value.byteLength;
        if (total > maxBytes) {
          throw new Error("YouTube audio is too large to process.");
        }
        chunks.push(value);
      }
    }

    const bytes = concatBytes(chunks);
    if (bytes.byteLength === 0) {
      throw new Error("Audio download failed for this YouTube video.");
    }

    return {
      bytes,
      mimeType: "audio/webm",
      durationSeconds,
    };
  } catch (cause) {
    if (cause instanceof Error && cause.message.startsWith("This YouTube")) {
      throw cause;
    }
    if (cause instanceof Error && cause.message.includes("OPENAI")) {
      throw cause;
    }
    const message =
      cause instanceof Error && cause.message
        ? cause.message
        : "Audio download failed for this YouTube video.";
    throw new Error(
      message.includes("Audio download") || message.includes("too large")
        ? message
        : `Audio download failed: ${message}`,
    );
  }
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}
