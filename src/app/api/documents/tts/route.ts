import {
  getDocumentByIdForOwner,
} from "@/features/library/server/documents";
import { getTranslation } from "@/features/translation/translate-document";
import {
  createSignedAudioUrl,
  generateDocumentAudio,
  generateTemporaryAudio,
  listAudioForDocument,
} from "@/features/tts/generate-audio";
import { logTtsExec, logTtsExecError } from "@/features/tts/tts-exec-debug";
import { updateDocumentProcessing } from "@/features/library/server/documents";

export const runtime = "nodejs";
export const maxDuration = 300;

const OWNER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_PASTE_CHARS = 32_000;

function jsonError(message: string, status: number) {
  return Response.json({ ok: false as const, error: message }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ownerId = url.searchParams.get("ownerId")?.trim() ?? "";
  const documentId = url.searchParams.get("documentId")?.trim() ?? "";

  if (!OWNER_ID_PATTERN.test(ownerId) || !OWNER_ID_PATTERN.test(documentId)) {
    return jsonError("Invalid ids.", 400);
  }

  try {
    const document = await getDocumentByIdForOwner(ownerId, documentId);
    if (!document) {
      return jsonError("Document not found.", 404);
    }
    const audio = await listAudioForDocument(documentId);
    const withUrls = await Promise.all(
      audio
        .filter((item) => item.status === "ready")
        .map(async (item) => ({
          ...item,
          url: await createSignedAudioUrl(item.storagePath).catch(() => null),
        })),
    );
    return Response.json({ ok: true as const, audio: withUrls });
  } catch (cause) {
    return jsonError(
      cause instanceof Error ? cause.message : "Unable to load audio.",
      400,
    );
  }
}

export async function POST(request: Request) {
  let body: {
    ownerId?: unknown;
    documentId?: unknown;
    rawText?: unknown;
    languageCode?: unknown;
    voice?: unknown;
    speed?: unknown;
    format?: unknown;
    prompt?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
  const documentId =
    typeof body.documentId === "string" ? body.documentId.trim() : "";
  const rawText = typeof body.rawText === "string" ? body.rawText : "";
  const languageCode =
    typeof body.languageCode === "string" ? body.languageCode : "original";
  const voice = typeof body.voice === "string" ? body.voice : "alloy";
  const prompt =
    typeof body.prompt === "string" ? body.prompt.trim() : undefined;
  const speed =
    typeof body.speed === "number"
      ? body.speed
      : typeof body.speed === "string"
        ? Number(body.speed)
        : undefined;
  const format =
    body.format === "wav" || body.format === "opus" || body.format === "mp3"
      ? body.format
      : "mp3";

  if (!OWNER_ID_PATTERN.test(ownerId)) {
    return jsonError("Invalid ids.", 400);
  }

  // Prefer documentId when present — PDF / Library path unchanged.
  if (documentId) {
    if (!OWNER_ID_PATTERN.test(documentId)) {
      return jsonError("Invalid ids.", 400);
    }

    try {
      const document = await getDocumentByIdForOwner(ownerId, documentId);
      if (!document) {
        return jsonError("Document not found.", 404);
      }

      let text = document.extractedText || "";
      let translationId: string | null = null;

      if (languageCode !== "original") {
        const translation = await getTranslation(documentId, languageCode);
        if (!translation || translation.status !== "ready") {
          return jsonError(
            "Translate the document to this language before generating audio.",
            400,
          );
        }
        text = translation.text;
        translationId = translation.id;
      }

      await updateDocumentProcessing(documentId, {
        processingStatus: document.processingStatus,
        processingStage: "generating_audio",
      });

      const audio = await generateDocumentAudio({
        documentId,
        guestId: ownerId,
        text,
        languageCode,
        voice,
        translationId,
        documentTitle: document.filename,
        prompt: prompt || undefined,
      });

      await updateDocumentProcessing(documentId, {
        processingStatus: "ready",
        processingStage: "ready",
      });

      logTtsExec("Signed URL creation", {
        storagePath: audio.storagePath,
      });
      const url = await createSignedAudioUrl(audio.storagePath);
      logTtsExec("Final success", {
        audioId: audio.id,
        hasUrl: Boolean(url),
      });
      return Response.json({ ok: true as const, audio: { ...audio, url } });
    } catch (cause) {
      logTtsExecError(cause);
      return jsonError(
        cause instanceof Error ? cause.message : "Audio generation failed.",
        400,
      );
    }
  }

  // Paste / plain-text path — no documents or document_audio rows.
  if (!rawText.trim()) {
    return jsonError("Paste or write text before generating audio.", 400);
  }
  if (rawText.length > MAX_PASTE_CHARS) {
    return jsonError(
      `Text is too long (${rawText.length} characters). Maximum is ${MAX_PASTE_CHARS}.`,
      400,
    );
  }

  try {
    const audio = await generateTemporaryAudio({
      guestId: ownerId,
      text: rawText,
      voice,
      speed: Number.isFinite(speed) ? speed : undefined,
      format,
      prompt: prompt || undefined,
    });
    return Response.json({
      ok: true as const,
      audio: {
        id: null,
        documentId: null,
        languageCode: "original",
        voice: audio.voice,
        status: "ready",
        storagePath: audio.storagePath,
        mimeType: audio.mimeType,
        url: audio.url,
        source: "paste",
      },
    });
  } catch (cause) {
    logTtsExecError(cause);
    return jsonError(
      cause instanceof Error ? cause.message : "Audio generation failed.",
      400,
    );
  }
}
