import { createHash } from "node:crypto";

import { AUDIO_BUCKET } from "@/constants";
import { TTS_LANGUAGES, TTS_VOICES, type TtsVoice } from "@/constants/languages";
import {
  getAiProviderLayer,
  isAiProviderError,
} from "@/features/ai-provider";
import { recordActivityEvent } from "@/features/history/record-event";
import { createServiceClient } from "@/lib/supabase/server";
import { logTtsExec, logTtsExecError } from "./tts-exec-debug";

export type DocumentAudioRecord = {
  id: string;
  documentId: string;
  translationId: string | null;
  languageCode: string;
  voice: string;
  storagePath: string;
  mimeType: string;
  durationSeconds: number | null;
  status: "queued" | "processing" | "ready" | "failed";
  errorMessage: string | null;
  createdAt: string;
};

/** Shared plain-text TTS input — used by PDF and Paste (and future text sources). */
export type GenerateAudioFromTextInput = {
  text: string;
  voice?: string;
  /** Accepted for future pipeline use; playback speed is client-side today. */
  speed?: number;
  format?: "mp3" | "wav" | "opus";
  /** Gemini-TTS style instruction (Cloud TTS input.prompt). */
  prompt?: string;
  guestId: string;
  /** Object key inside the audio bucket (no bucket prefix). */
  objectKey: string;
  /** Optional orchestrator context only — not required for paste. */
  documentId?: string;
};

export type GeneratedAudioUpload = {
  storagePath: string;
  mimeType: string;
  byteLength: number;
};

export type TemporaryAudioResult = {
  storagePath: string;
  mimeType: string;
  url: string;
  voice: string;
  format: "mp3" | "wav" | "opus";
};

function toAudio(row: Record<string, unknown>): DocumentAudioRecord {
  return {
    id: String(row.id),
    documentId: String(row.document_id),
    translationId: (row.translation_id as string | null) ?? null,
    languageCode: String(row.language_code),
    voice: String(row.voice),
    storagePath: String(row.storage_path),
    mimeType: String(row.mime_type ?? "audio/mpeg"),
    durationSeconds:
      row.duration_seconds == null ? null : Number(row.duration_seconds),
    status: row.status as DocumentAudioRecord["status"],
    errorMessage: (row.error_message as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function mimeForFormat(format: "mp3" | "wav" | "opus"): string {
  if (format === "wav") {
    return "audio/wav";
  }
  if (format === "opus") {
    return "audio/opus";
  }
  return "audio/mpeg";
}

function hashText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export async function listAudioForDocument(
  documentId: string,
): Promise<DocumentAudioRecord[]> {
  const client = createServiceClient();
  const { data, error } = await client
    .from("document_audio")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message || "Unable to load audio.");
  }

  return ((data as Record<string, unknown>[] | null) ?? []).map(toAudio);
}

async function synthesizeSpeechChunk(input: {
  documentId?: string;
  text: string;
  voice: string;
  format: "mp3" | "wav" | "opus";
  prompt?: string;
}): Promise<Uint8Array> {
  const layer = getAiProviderLayer();
  try {
    const response = await layer.orchestrator.execute({
      feature: "tts",
      documentId: input.documentId,
      text: input.text,
      voice: input.voice,
      format: input.format,
      prompt: input.prompt,
    });
    if (response.kind !== "tts" || response.bytes.byteLength === 0) {
      throw new Error("Audio generation failed.");
    }
    return response.bytes;
  } catch (cause) {
    logTtsExecError(cause);
    if (isAiProviderError(cause)) {
      throw new Error(cause.message);
    }
    throw cause instanceof Error ? cause : new Error("Audio generation failed.");
  }
}

/**
 * Shared audio path: plain text → chunk → TTS (Piper/…) → storage.
 * Used by PDF (`generateDocumentAudio`) and Paste (`generateTemporaryAudio`).
 */
export async function generateAudioFromText(
  input: GenerateAudioFromTextInput,
): Promise<GeneratedAudioUpload> {
  const text = input.text;
  if (!text.trim()) {
    throw new Error("No text available to generate audio.");
  }

  const voice = (input.voice || "alloy") as string;
  if (!TTS_VOICES.includes(voice as TtsVoice) && voice !== "alloy") {
    // Allow known OpenAI voices; default alloy already covered.
  }

  const format = input.format ?? "mp3";
  const mimeType = mimeForFormat(format);
  // speed reserved for future synthesis; unused by adapters today.
  void input.speed;
  const prompt = input.prompt?.trim() || undefined;

  const client = createServiceClient();

  // OpenAI TTS input limit ~4096 chars — chunk and concatenate.
  const maxChars = 4000;
  const pieces: Uint8Array[] = [];
  for (let start = 0; start < text.length; start += maxChars) {
    const slice = text.slice(start, start + maxChars);
    pieces.push(
      await synthesizeSpeechChunk({
        documentId: input.documentId,
        text: slice,
        voice,
        format,
        prompt,
      }),
    );
    if (pieces.length >= 8) {
      break;
    }
  }

  const bytes = concatBytes(pieces);
  logTtsExec("Audio bytes received", {
    size: bytes.byteLength,
    pieceCount: pieces.length,
  });

  const objectKey = input.objectKey;
  logTtsExec("Upload to Supabase Storage", {
    bucket: AUDIO_BUCKET,
    path: objectKey,
  });
  const { error: uploadError } = await client.storage
    .from(AUDIO_BUCKET)
    .upload(objectKey, bytes, {
      contentType: mimeType,
      upsert: true,
    });
  logTtsExec("Storage upload result", {
    bucket: AUDIO_BUCKET,
    path: objectKey,
    ok: !uploadError,
    error: uploadError?.message ?? null,
  });

  if (!uploadError) {
    return {
      storagePath: `${AUDIO_BUCKET}/${objectKey}`,
      mimeType,
      byteLength: bytes.byteLength,
    };
  }

  // Fall back to pdfs bucket prefix if dedicated bucket missing.
  const fallbackKey = `audio/${objectKey}`;
  logTtsExec("Upload to Supabase Storage", {
    bucket: "pdfs",
    path: fallbackKey,
    fallback: true,
  });
  const { error: fallbackError } = await client.storage
    .from("pdfs")
    .upload(fallbackKey, bytes, {
      contentType: mimeType,
      upsert: true,
    });
  logTtsExec("Storage upload result", {
    bucket: "pdfs",
    path: fallbackKey,
    ok: !fallbackError,
    error: fallbackError?.message ?? null,
  });
  if (fallbackError) {
    throw new Error(uploadError.message || "Unable to store generated audio.");
  }

  return {
    storagePath: `pdfs/${fallbackKey}`,
    mimeType,
    byteLength: bytes.byteLength,
  };
}

/**
 * Generate TTS audio for original or translated text and store in Supabase.
 * Phase 5: synthesis goes through the AI Provider Layer (no direct SDK calls).
 * PDF / Library path — keeps document_audio records (unchanged behavior).
 */
export async function generateDocumentAudio(input: {
  documentId: string;
  guestId: string;
  text: string;
  languageCode: string;
  voice?: string;
  translationId?: string | null;
  documentTitle?: string;
  prompt?: string;
}): Promise<DocumentAudioRecord> {
  logTtsExec("Request start", {
    documentId: input.documentId,
    languageCode: input.languageCode,
    voice: input.voice ?? "alloy",
    textChars: input.text.length,
  });

  const language =
    input.languageCode === "original"
      ? { code: "original", label: "Original" }
      : TTS_LANGUAGES.find((item) => item.code === input.languageCode);

  if (!language) {
    throw new Error("Unsupported audio language.");
  }

  const voice = (input.voice || "alloy") as string;
  if (!TTS_VOICES.includes(voice as TtsVoice) && voice !== "alloy") {
    // Allow known OpenAI voices; default alloy already covered.
  }

  if (!input.text.trim()) {
    throw new Error("No text available to generate audio.");
  }

  const prompt = input.prompt?.trim() || undefined;
  const client = createServiceClient();
  const objectKey = `${input.guestId}/${input.documentId}/${language.code}-${voice}.mp3`;
  const storagePath = `${AUDIO_BUCKET}/${objectKey}`;

  const existing = await client
    .from("document_audio")
    .select("*")
    .eq("document_id", input.documentId)
    .eq("language_code", language.code)
    .eq("voice", voice)
    .maybeSingle();

  // Preserve cache when no style prompt; regenerate when a style is provided
  // so preset/custom changes can take effect without a schema change.
  if (existing.data && existing.data.status === "ready" && !prompt) {
    logTtsExec("Final success", {
      source: "cache",
      audioId: existing.data.id,
    });
    return toAudio(existing.data as Record<string, unknown>);
  }

  logTtsExec("Database update", {
    phase: "upsert_processing",
    languageCode: language.code,
    voice,
  });
  const { data: row, error: upsertError } = await client
    .from("document_audio")
    .upsert(
      {
        document_id: input.documentId,
        translation_id: input.translationId ?? null,
        language_code: language.code,
        voice,
        storage_path: storagePath,
        mime_type: "audio/mpeg",
        status: "processing",
        error_message: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "document_id,language_code,voice" },
    )
    .select("*")
    .single();
  logTtsExec("Database update", {
    phase: "upsert_processing_result",
    ok: Boolean(row) && !upsertError,
    error: upsertError?.message ?? null,
  });

  if (upsertError || !row) {
    const err = new Error(
      upsertError?.message || "Unable to start audio generation.",
    );
    logTtsExecError(err);
    throw err;
  }

  try {
    const uploaded = await generateAudioFromText({
      text: input.text,
      voice,
      format: "mp3",
      prompt,
      guestId: input.guestId,
      objectKey,
      documentId: input.documentId,
    });

    const finalPath = uploaded.storagePath;
    const usedFallback = finalPath !== storagePath;

    logTtsExec("Database update", {
      phase: usedFallback ? "mark_ready_fallback" : "mark_ready",
      storagePath: finalPath,
    });
    const { data: saved, error: saveError } = await client
      .from("document_audio")
      .update({
        ...(usedFallback ? { storage_path: finalPath } : {}),
        status: "ready",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .select("*")
      .single();
    logTtsExec("Database update", {
      phase: usedFallback
        ? "mark_ready_fallback_result"
        : "mark_ready_result",
      ok: Boolean(saved) && !saveError,
      error: saveError?.message ?? null,
    });
    if (saveError || !saved) {
      throw new Error(saveError?.message || "Unable to save audio record.");
    }

    await recordActivityEvent({
      guestId: input.guestId,
      documentId: input.documentId,
      eventType: "audio_generated",
      title: `Audio generated (${language.label})`,
      detail: input.documentTitle || null,
      metadata: { languageCode: language.code, voice },
    });
    logTtsExec("Final success", {
      audioId: saved.id,
      storagePath: finalPath,
    });
    return toAudio(saved as Record<string, unknown>);
  } catch (cause) {
    logTtsExecError(cause);
    const message =
      cause instanceof Error && cause.message
        ? cause.message
        : "Audio generation failed.";
    await client
      .from("document_audio")
      .update({
        status: "failed",
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    throw new Error(message);
  }
}

async function storageObjectExists(storagePath: string): Promise<boolean> {
  const client = createServiceClient();
  const bucket = storagePath.startsWith(`${AUDIO_BUCKET}/`)
    ? AUDIO_BUCKET
    : storagePath.startsWith("pdfs/")
      ? "pdfs"
      : AUDIO_BUCKET;
  const key = storagePath.startsWith(`${bucket}/`)
    ? storagePath.slice(bucket.length + 1)
    : storagePath;
  const slash = key.lastIndexOf("/");
  const folder = slash >= 0 ? key.slice(0, slash) : "";
  const name = slash >= 0 ? key.slice(slash + 1) : key;
  const { data, error } = await client.storage.from(bucket).list(folder, {
    limit: 100,
    search: name,
  });
  if (error || !data) {
    return false;
  }
  return data.some((item) => item.name === name);
}

/**
 * Temporary paste/text audio — storage only, no documents / document_audio rows.
 */
export async function generateTemporaryAudio(input: {
  guestId: string;
  text: string;
  voice?: string;
  speed?: number;
  format?: "mp3" | "wav" | "opus";
  prompt?: string;
}): Promise<TemporaryAudioResult> {
  const text = input.text;
  if (!text.trim()) {
    throw new Error("No text available to generate audio.");
  }

  const voice = input.voice || "alloy";
  const format = input.format ?? "mp3";
  const prompt = input.prompt?.trim() || undefined;
  const extension = format === "mp3" ? "mp3" : format;
  // Include style prompt in cache key so different presets don't reuse audio.
  const contentHash = hashText(prompt ? `${text}\0${prompt}` : text);
  const objectKey = `${input.guestId}/paste/${contentHash}-${voice}.${extension}`;
  const primaryPath = `${AUDIO_BUCKET}/${objectKey}`;
  const fallbackPath = `pdfs/audio/${objectKey}`;

  // Reuse existing object if present (hash+voice key) — no DB.
  for (const candidate of [primaryPath, fallbackPath]) {
    if (await storageObjectExists(candidate)) {
      const url = await createSignedAudioUrl(candidate);
      logTtsExec("Final success", {
        source: "paste_storage_cache",
        storagePath: candidate,
      });
      return {
        storagePath: candidate,
        mimeType: mimeForFormat(format),
        url,
        voice,
        format,
      };
    }
  }

  logTtsExec("Request start", {
    source: "paste",
    voice,
    textChars: text.length,
    objectKey,
  });

  const uploaded = await generateAudioFromText({
    text,
    voice,
    speed: input.speed,
    format,
    prompt,
    guestId: input.guestId,
    objectKey,
  });

  const url = await createSignedAudioUrl(uploaded.storagePath);
  logTtsExec("Final success", {
    source: "paste",
    storagePath: uploaded.storagePath,
  });

  return {
    storagePath: uploaded.storagePath,
    mimeType: uploaded.mimeType,
    url,
    voice,
    format,
  };
}

export async function createSignedAudioUrl(
  storagePath: string,
  expiresIn = 3600,
): Promise<string> {
  const client = createServiceClient();
  const bucket = storagePath.startsWith(`${AUDIO_BUCKET}/`)
    ? AUDIO_BUCKET
    : storagePath.startsWith("pdfs/")
      ? "pdfs"
      : AUDIO_BUCKET;
  const key = storagePath.startsWith(`${bucket}/`)
    ? storagePath.slice(bucket.length + 1)
    : storagePath;

  logTtsExec("Signed URL creation", { bucket, path: key });
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(key, expiresIn);

  if (error || !data?.signedUrl) {
    const err = new Error(error?.message || "Unable to create audio URL.");
    logTtsExecError(err);
    throw err;
  }
  logTtsExec("Signed URL creation", { ok: true, bucket, path: key });
  return data.signedUrl;
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
