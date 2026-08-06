/**
 * Local Piper TTS adapter.
 * Provider process for speech may only live here — not in feature modules.
 * Piper writes WAV; ffmpeg converts to MP3 before returning.
 */

import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { AiProviderError } from "../../errors";
import {
  keyIndexLabel,
  logTtsExec,
  logTtsExecError,
} from "@/features/tts/tts-exec-debug";
import type { AiTtsResponse } from "../../responses";
import type { AiProviderAdapter, AdapterExecutionContext } from "../types";
import type { AiTtsRequest } from "../../types";

function piperError(message: string, keyId?: string): AiProviderError {
  return new AiProviderError({
    code: "provider_unavailable",
    message,
    providerId: "piper",
    keyId,
    retryable: true,
  });
}

function requireEnv(name: "PIPER_BIN" | "PIPER_MODEL" | "FFMPEG_BIN"): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw piperError(
      name === "FFMPEG_BIN"
        ? "ffmpeg is unavailable: FFMPEG_BIN is not set."
        : `${name} is not set.`,
    );
  }
  return value;
}

type PiperProcessResult = {
  command: string;
  args: string[];
  cwd: string;
  stderr: string;
  stdoutLength: number;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
};

type FfmpegProcessResult = {
  command: string;
  args: string[];
  stderr: string;
  exitCode: number | null;
};

async function fileInfo(
  path: string,
): Promise<{ exists: boolean; size: number | null }> {
  try {
    const info = await stat(path);
    return { exists: true, size: info.size };
  } catch {
    return { exists: false, size: null };
  }
}

function spawnPiper(options: {
  bin: string;
  model: string;
  inputFile: string;
  outputFile: string;
}): Promise<PiperProcessResult> {
  const args = [
    "--model",
    options.model,
    "--input_file",
    options.inputFile,
    "--output_file",
    options.outputFile,
  ];
  const cwd = process.cwd();

  return new Promise((resolve, reject) => {
    const child = spawn(options.bin, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    child.on("error", (cause) => {
      reject(cause);
    });

    child.on("close", (exitCode, signal) => {
      const stdout = Buffer.concat(stdoutChunks);
      resolve({
        command: options.bin,
        args,
        cwd,
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
        stdoutLength: stdout.byteLength,
        exitCode,
        signal,
      });
    });
  });
}

function spawnFfmpegWavToMp3(options: {
  ffmpegBin: string;
  inputWav: string;
  outputMp3: string;
}): Promise<FfmpegProcessResult> {
  const args = [
    "-y",
    "-i",
    options.inputWav,
    "-codec:a",
    "libmp3lame",
    "-q:a",
    "2",
    options.outputMp3,
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(options.ffmpegBin, args, {
      stdio: ["ignore", "ignore", "pipe"],
    });

    const stderrChunks: Buffer[] = [];
    child.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    child.on("error", (cause) => {
      const detail =
        cause instanceof Error && "code" in cause && cause.code === "ENOENT"
          ? `ffmpeg is unavailable: cannot execute FFMPEG_BIN ("${options.ffmpegBin}").`
          : cause instanceof Error
            ? `ffmpeg is unavailable: ${cause.message}`
            : "ffmpeg is unavailable.";
      reject(piperError(detail));
    });

    child.on("close", (exitCode) => {
      resolve({
        command: options.ffmpegBin,
        args,
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
        exitCode,
      });
    });
  });
}

/**
 * Run Piper via temp input.txt → output.wav, then ffmpeg → output.mp3.
 */
async function runPiper(options: {
  bin: string;
  model: string;
  ffmpegBin: string;
  text: string;
}): Promise<{
  bytes: Buffer;
  stderr: string;
  exitCode: number | null;
  stage: "piper" | "ffmpeg" | "ok";
  piper: PiperProcessResult | null;
  failureReason: string | null;
}> {
  const tempDir = await mkdtemp(join(tmpdir(), "echoreadly-piper-"));
  const inputFile = join(tempDir, "input.txt");
  const outputWav = join(tempDir, "output.wav");
  const outputMp3 = join(tempDir, "output.mp3");

  try {
    await writeFile(inputFile, options.text, "utf8");

    const piper = await spawnPiper({
      bin: options.bin,
      model: options.model,
      inputFile,
      outputFile: outputWav,
    });

    logTtsExec("Piper process", {
      command: piper.command,
      args: piper.args,
      cwd: piper.cwd,
      stderr: piper.stderr.slice(0, 4000),
      stdoutLength: piper.stdoutLength,
      exitCode: piper.exitCode,
      signal: piper.signal,
    });

    const wav = await fileInfo(outputWav);
    logTtsExec("Piper output.wav", {
      exists: wav.exists,
      size: wav.size,
      path: outputWav,
    });

    if (piper.exitCode !== 0) {
      const stderr = piper.stderr.trim();
      const reason = [
        `Piper exited with code ${String(piper.exitCode)}`,
        piper.signal ? `signal=${piper.signal}` : null,
        stderr || null,
      ]
        .filter(Boolean)
        .join(": ");
      return {
        bytes: Buffer.alloc(0),
        stderr: piper.stderr,
        exitCode: piper.exitCode,
        stage: "piper",
        piper,
        failureReason: reason,
      };
    }

    if (!wav.exists) {
      return {
        bytes: Buffer.alloc(0),
        stderr: piper.stderr,
        exitCode: piper.exitCode,
        stage: "piper",
        piper,
        failureReason: `Piper exited 0 but output.wav does not exist at ${outputWav}.`,
      };
    }

    if (wav.size === 0) {
      return {
        bytes: Buffer.alloc(0),
        stderr: piper.stderr,
        exitCode: piper.exitCode,
        stage: "piper",
        piper,
        failureReason: `Piper exited 0 but output.wav is empty (0 bytes) at ${outputWav}.`,
      };
    }

    const ffmpeg = await spawnFfmpegWavToMp3({
      ffmpegBin: options.ffmpegBin,
      inputWav: outputWav,
      outputMp3,
    });

    const mp3 = await fileInfo(outputMp3);
    logTtsExec("ffmpeg process", {
      command: ffmpeg.command,
      args: ffmpeg.args,
      exitCode: ffmpeg.exitCode,
      stderr: ffmpeg.stderr.slice(0, 4000),
      outputMp3Exists: mp3.exists,
      outputMp3Size: mp3.size,
    });

    if (ffmpeg.exitCode !== 0) {
      const stderr = ffmpeg.stderr.trim();
      const reason = [
        `ffmpeg exited with code ${String(ffmpeg.exitCode)}`,
        stderr || null,
      ]
        .filter(Boolean)
        .join(": ");
      return {
        bytes: Buffer.alloc(0),
        stderr: ffmpeg.stderr,
        exitCode: ffmpeg.exitCode,
        stage: "ffmpeg",
        piper,
        failureReason: reason,
      };
    }

    if (!mp3.exists) {
      return {
        bytes: Buffer.alloc(0),
        stderr: ffmpeg.stderr,
        exitCode: ffmpeg.exitCode,
        stage: "ffmpeg",
        piper,
        failureReason: `ffmpeg exited 0 but output.mp3 does not exist at ${outputMp3}.`,
      };
    }

    if (mp3.size === 0) {
      return {
        bytes: Buffer.alloc(0),
        stderr: ffmpeg.stderr,
        exitCode: ffmpeg.exitCode,
        stage: "ffmpeg",
        piper,
        failureReason: `ffmpeg exited 0 but output.mp3 is empty (0 bytes) at ${outputMp3}.`,
      };
    }

    const bytes = await readFile(outputMp3);
    logTtsExec("Returned buffer", {
      length: bytes.byteLength,
      outputWavExists: wav.exists,
      outputWavSize: wav.size,
      outputMp3Exists: mp3.exists,
      outputMp3Size: mp3.size,
    });

    return {
      bytes,
      stderr: [piper.stderr, ffmpeg.stderr].filter(Boolean).join("\n"),
      exitCode: 0,
      stage: "ok",
      piper,
      failureReason: null,
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export function createPiperTtsAdapter(): AiProviderAdapter {
  return {
    providerId: "piper",

    async synthesizeSpeech(
      request: AiTtsRequest,
      context: AdapterExecutionContext,
    ): Promise<Omit<AiTtsResponse, "attempts">> {
      const started = Date.now();
      const selectedKeyIndex = keyIndexLabel("piper", context.keyId);

      let bin: string;
      let model: string;
      let ffmpegBin: string;
      try {
        bin = requireEnv("PIPER_BIN");
        model = requireEnv("PIPER_MODEL");
        ffmpegBin = requireEnv("FFMPEG_BIN");
      } catch (cause) {
        logTtsExecError(cause, {
          provider: "piper",
          model: context.modelId,
          keyIndex: selectedKeyIndex,
        });
        throw cause;
      }

      logTtsExec("Piper request start", {
        model: context.modelId,
        voice: model,
        selectedKeyIndex,
        bin,
        ffmpegBin,
      });

      let result: {
        bytes: Buffer;
        stderr: string;
        exitCode: number | null;
        stage: "piper" | "ffmpeg" | "ok";
        piper: PiperProcessResult | null;
        failureReason: string | null;
      };
      try {
        result = await runPiper({
          bin,
          model,
          ffmpegBin,
          text: request.text,
        });
      } catch (cause) {
        logTtsExecError(cause, {
          provider: "piper",
          model: context.modelId,
          keyIndex: selectedKeyIndex,
        });
        throw cause;
      }

      logTtsExec("Piper response", {
        httpStatus: result.exitCode === 0 ? 200 : result.exitCode ?? 500,
        responseBody: result.stderr.slice(0, 2000) || "(mp3 file)",
        requestId: null,
        stage: result.stage,
        returnedBufferLength: result.bytes.byteLength,
      });

      if (result.failureReason || result.exitCode !== 0) {
        const mapped = piperError(
          result.failureReason ??
            `Piper/ffmpeg failed with exit code ${String(result.exitCode)}.`,
          context.keyId,
        );
        logTtsExecError(mapped, {
          provider: "piper",
          model: context.modelId,
          keyIndex: selectedKeyIndex,
        });
        throw mapped;
      }

      const buffer = result.bytes;
      logTtsExec("Audio bytes received", {
        size: buffer.byteLength,
      });

      if (buffer.byteLength === 0) {
        const mapped = piperError(
          result.stderr.trim() ||
            "Piper TTS returned empty MP3 audio (buffer length 0).",
          context.keyId,
        );
        logTtsExecError(mapped, {
          provider: "piper",
          model: context.modelId,
          keyIndex: selectedKeyIndex,
        });
        throw mapped;
      }

      return {
        kind: "tts",
        bytes: buffer,
        mimeType: "audio/mpeg",
        providerId: "piper",
        modelId: context.modelId,
        keyId: context.keyId,
        capability: "tts",
        usage: {
          inputTokens: null,
          outputTokens: null,
          totalTokens: null,
          latencyMs: Date.now() - started,
          estimatedCostUsd: null,
        },
      };
    },
  };
}
