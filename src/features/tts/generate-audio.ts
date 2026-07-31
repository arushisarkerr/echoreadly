import { AUDIO_BUCKET } from "@/constants";
import { TTS_LANGUAGES, TTS_VOICES, type TtsVoice } from "@/constants/languages";
import { recordActivityEvent } from "@/features/history/record-event";
import { getOpenAIClient } from "@/lib/ai/openai";
import { createServiceClient } from "@/lib/supabase/server";

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

/**
 * Generate TTS audio for original or translated text and store in Supabase.
 */
export async function generateDocumentAudio(input: {
  documentId: string;
  guestId: string;
  text: string;
  languageCode: string;
  voice?: string;
  translationId?: string | null;
  documentTitle?: string;
}): Promise<DocumentAudioRecord> {
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

  if (existing.data && existing.data.status === "ready") {
    return toAudio(existing.data as Record<string, unknown>);
  }

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

  if (upsertError || !row) {
    throw new Error(upsertError?.message || "Unable to start audio generation.");
  }

  try {
    const openai = getOpenAIClient();
    // OpenAI TTS input limit ~4096 chars — chunk and concatenate MP3s simply by taking first chunk for MVP long docs.
    const maxChars = 4000;
    const pieces: Uint8Array[] = [];
    for (let start = 0; start < input.text.length; start += maxChars) {
      const slice = input.text.slice(start, start + maxChars);
      const speech = await openai.audio.speech.create({
        model: process.env.OPENAI_TTS_MODEL?.trim() || "tts-1",
        voice: voice as TtsVoice,
        input: slice,
        response_format: "mp3",
      });
      pieces.push(new Uint8Array(await speech.arrayBuffer()));
      // Cap total generated audio pieces to keep cost/latency bounded.
      if (pieces.length >= 8) {
        break;
      }
    }

    const bytes = concatBytes(pieces);
    const { error: uploadError } = await client.storage
      .from(AUDIO_BUCKET)
      .upload(objectKey, bytes, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      // Fall back to pdfs bucket prefix if dedicated bucket missing.
      const fallbackKey = `audio/${objectKey}`;
      const { error: fallbackError } = await client.storage
        .from("pdfs")
        .upload(fallbackKey, bytes, {
          contentType: "audio/mpeg",
          upsert: true,
        });
      if (fallbackError) {
        throw new Error(uploadError.message || "Unable to store generated audio.");
      }
      const fallbackPath = `pdfs/${fallbackKey}`;
      const { data: saved, error: saveError } = await client
        .from("document_audio")
        .update({
          storage_path: fallbackPath,
          status: "ready",
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .select("*")
        .single();
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
      return toAudio(saved as Record<string, unknown>);
    }

    const { data: saved, error: saveError } = await client
      .from("document_audio")
      .update({
        status: "ready",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .select("*")
      .single();

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

    return toAudio(saved as Record<string, unknown>);
  } catch (cause) {
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

  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(key, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Unable to create audio URL.");
  }
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
