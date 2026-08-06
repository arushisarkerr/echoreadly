/**
 * Merge Google Gemini TTS MP3 chunks into one valid MP3 via FFmpeg.
 *
 * Uses filter_complex `concat` so FFmpeg decodes each chunk to PCM, concatenates,
 * then re-encodes with libmp3lame. Never raw-concatenates MP3 bitstreams
 * (that yields broken duration/seeking in many players).
 *
 * Multi-chunk Gemini TTS requires a resolvable FFmpeg binary (see resolveFfmpegBin).
 * There is no silent fallback to byte concatenation.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { logTtsExec } from "@/features/tts/tts-exec-debug";

/**
 * Runtime FFmpeg resolution (Next.js 16 / Turbopack / Vercel serverless):
 * 1. FFMPEG_BIN env var — highest priority (explicit override)
 * 2. Bundled ffmpeg-static at `<cwd>/node_modules/ffmpeg-static/ffmpeg`
 *    (Vercel: cwd is /var/task; NFT includes this file)
 * 3. Otherwise throw a clear server error (never PATH / Homebrew / byte-concat)
 *
 * Do not use require.resolve("ffmpeg-static/...") — Turbopack rewrites it and
 * breaks absolute path resolution in the deployed function. Use cwd + known
 * package path instead (same approach as vercel-labs/ffmpeg-on-vercel).
 */
function resolveBundledStaticFfmpeg(): string | null {
  const binaryName = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  // process.cwd() === /var/task on Vercel; NFT places node_modules/ffmpeg-static here.
  const binaryPath = join(
    process.cwd(),
    "node_modules",
    "ffmpeg-static",
    binaryName,
  );
  if (existsSync(binaryPath)) {
    return binaryPath;
  }
  return null;
}

function resolveFfmpegBin(): string {
  const fromEnv = process.env.FFMPEG_BIN?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const bundled = resolveBundledStaticFfmpeg();
  if (bundled) {
    return bundled;
  }

  throw new Error(
    "FFmpeg is required for multi-chunk Google Gemini TTS (decode → PCM → concat → libmp3lame). " +
      "Set FFMPEG_BIN to an executable path, or ensure the ffmpeg-static package binary is installed. " +
      "Homebrew/PATH-only ffmpeg is not used in production.",
  );
}

function ffmpegUnavailableError(ffmpegBin: string, cause?: unknown): Error {
  const detail =
    cause instanceof Error && "code" in cause && cause.code === "ENOENT"
      ? `cannot execute "${ffmpegBin}"`
      : cause instanceof Error
        ? cause.message
        : "unknown error";
  return new Error(
    `FFmpeg is required for multi-chunk Google Gemini TTS (decode → PCM → concat → libmp3lame). ` +
      `Checked FFMPEG_BIN then the bundled ffmpeg-static binary. (${detail})`,
  );
}

/**
 * Decode each MP3 chunk to PCM, concat audio streams, re-encode to one MP3.
 * Single-chunk input bypasses FFmpeg entirely (fast path).
 * Temp files are always removed in `finally`, including on FFmpeg failure.
 */
export async function mergeMp3ChunksWithFfmpeg(
  chunks: Uint8Array[],
): Promise<Uint8Array> {
  if (chunks.length === 0) {
    throw new Error("No MP3 chunks to merge.");
  }
  // Single chunk: already a valid MP3 — do not invoke FFmpeg.
  if (chunks.length === 1) {
    return chunks[0];
  }

  const ffmpegBin = resolveFfmpegBin();
  const tempDir = await mkdtemp(join(tmpdir(), "echoreadly-google-tts-"));
  const outputMp3 = join(tempDir, "merged.mp3");

  try {
    const inputPaths: string[] = [];
    for (let i = 0; i < chunks.length; i += 1) {
      const path = join(tempDir, `chunk-${String(i).padStart(4, "0")}.mp3`);
      await writeFile(path, Buffer.from(chunks[i]));
      inputPaths.push(path);
    }

    // filter_complex concat: decode → PCM → concat → libmp3lame (not -c copy / not byte concat).
    const filterInputs = inputPaths.map((_, i) => `[${i}:a]`).join("");
    const filter = `${filterInputs}concat=n=${inputPaths.length}:v=0:a=1[outa]`;
    const args = [
      "-y",
      ...inputPaths.flatMap((path) => ["-i", path]),
      "-filter_complex",
      filter,
      "-map",
      "[outa]",
      "-codec:a",
      "libmp3lame",
      "-q:a",
      "2",
      outputMp3,
    ];

    const result = await spawnFfmpeg(ffmpegBin, args);
    logTtsExec("ffmpeg merge mp3", {
      command: ffmpegBin,
      chunkCount: chunks.length,
      exitCode: result.exitCode,
      stderr: result.stderr.slice(0, 4000),
    });

    if (result.exitCode !== 0) {
      throw new Error(
        `FFmpeg failed to merge multi-chunk Google Gemini TTS audio (exit ${String(result.exitCode)}): ${result.stderr.trim().slice(0, 500) || "no stderr"}`,
      );
    }

    const merged = await readFile(outputMp3);
    if (merged.byteLength === 0) {
      throw new Error("FFmpeg produced an empty merged MP3.");
    }
    return new Uint8Array(merged);
  } finally {
    // Always delete temp chunk/output files, even when FFmpeg fails.
    await rm(tempDir, { recursive: true, force: true }).catch(() => {
      // best-effort cleanup
    });
  }
}

function spawnFfmpeg(
  ffmpegBin: string,
  args: string[],
): Promise<{ exitCode: number | null; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegBin, args, {
      stdio: ["ignore", "ignore", "pipe"],
    });

    const stderrChunks: Buffer[] = [];
    child.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    child.on("error", (cause) => {
      reject(ffmpegUnavailableError(ffmpegBin, cause));
    });

    child.on("close", (exitCode) => {
      resolve({
        exitCode,
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
      });
    });
  });
}
