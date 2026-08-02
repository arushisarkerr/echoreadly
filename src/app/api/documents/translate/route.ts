import {
  getDocumentByIdForOwner,
} from "@/features/library/server/documents";
import {
  getTranslation,
  listTranslationsForDocument,
  translateDocument,
} from "@/features/translation/translate-document";
import { updateDocumentProcessing } from "@/features/library/server/documents";

export const runtime = "nodejs";
export const maxDuration = 300;

const OWNER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    const translations = await listTranslationsForDocument(documentId);
    return Response.json({ ok: true as const, translations });
  } catch (cause) {
    return jsonError(
      cause instanceof Error ? cause.message : "Unable to load translations.",
      400,
    );
  }
}

export async function POST(request: Request) {
  let body: {
    ownerId?: unknown;
    documentId?: unknown;
    languageCode?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
  const documentId = typeof body.documentId === "string" ? body.documentId : "";
  const languageCode =
    typeof body.languageCode === "string" ? body.languageCode.trim() : "";

  console.info("[translation flow]", "API request body", {
    documentId,
    languageCode,
  });

  if (!OWNER_ID_PATTERN.test(ownerId) || !OWNER_ID_PATTERN.test(documentId)) {
    return jsonError("Invalid ids.", 400);
  }

  if (!languageCode) {
    return jsonError("languageCode is required.", 400);
  }

  try {
    const document = await getDocumentByIdForOwner(ownerId, documentId);
    if (!document) {
      return jsonError("Document not found.", 404);
    }
    if (!document.extractedText?.trim()) {
      return jsonError("Document has no original text yet.", 400);
    }

    await updateDocumentProcessing(documentId, {
      processingStatus: document.processingStatus,
      processingStage: "generating_translation",
    });

    const existing = await getTranslation(documentId, languageCode);
    console.info("[translation flow]", "existing translation lookup", {
      documentId,
      languageCode,
      found: Boolean(existing),
      status: existing?.status ?? null,
      languageLabel: existing?.languageLabel ?? null,
      textChars: existing?.text?.length ?? 0,
    });

    // Only short-circuit when a ready translation has real text.
    // Ready+empty rows (legacy backfill / partial writes) must re-run.
    if (existing?.status === "ready" && existing.text.trim()) {
      console.info("[translation flow]", "API response (cache hit)", {
        documentId,
        languageCode: existing.languageCode,
        languageLabel: existing.languageLabel,
        textChars: existing.text.length,
      });
      return Response.json({ ok: true as const, translation: existing });
    }

    const translation = await translateDocument({
      documentId,
      guestId: ownerId,
      originalText: document.extractedText,
      languageCode,
      documentTitle: document.filename,
    });

    await updateDocumentProcessing(documentId, {
      processingStatus: "ready",
      processingStage: "ready",
    });

    console.info("[translation flow]", "API response (fresh)", {
      documentId,
      languageCode: translation.languageCode,
      languageLabel: translation.languageLabel,
      status: translation.status,
      textChars: translation.text.length,
      wordCount: translation.wordCount,
    });

    return Response.json({ ok: true as const, translation });
  } catch (cause) {
    console.info("[translation flow]", "API final error", {
      documentId,
      languageCode,
      error: cause instanceof Error ? cause.message : "Translation failed.",
    });
    return jsonError(
      cause instanceof Error ? cause.message : "Translation failed.",
      400,
    );
  }
}
