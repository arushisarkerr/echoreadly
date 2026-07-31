import {
  exportDocumentText,
  listExportsForOwner,
  type ExportFormat,
} from "@/features/export/build-export";
import { getDocumentByIdForOwner } from "@/features/library/server/documents";
import { getTranslation } from "@/features/translation/translate-document";

export const runtime = "nodejs";
export const maxDuration = 120;

const OWNER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FORMATS = new Set<ExportFormat>(["txt", "md", "docx", "pdf"]);

function jsonError(message: string, status: number) {
  return Response.json({ ok: false as const, error: message }, { status });
}

export async function GET(request: Request) {
  const ownerId = new URL(request.url).searchParams.get("ownerId")?.trim() ?? "";
  if (!OWNER_ID_PATTERN.test(ownerId)) {
    return jsonError("Invalid owner id.", 400);
  }
  try {
    const exports = await listExportsForOwner(ownerId);
    return Response.json({ ok: true as const, exports });
  } catch (cause) {
    return jsonError(
      cause instanceof Error ? cause.message : "Unable to load exports.",
      400,
    );
  }
}

export async function POST(request: Request) {
  let body: {
    ownerId?: unknown;
    documentId?: unknown;
    format?: unknown;
    languageCode?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
  const documentId = typeof body.documentId === "string" ? body.documentId : "";
  const format = typeof body.format === "string" ? body.format : "";
  const languageCode =
    typeof body.languageCode === "string" ? body.languageCode : "original";

  if (!OWNER_ID_PATTERN.test(ownerId) || !OWNER_ID_PATTERN.test(documentId)) {
    return jsonError("Invalid ids.", 400);
  }
  if (!FORMATS.has(format as ExportFormat)) {
    return jsonError("Unsupported export format.", 400);
  }

  try {
    const document = await getDocumentByIdForOwner(ownerId, documentId);
    if (!document) {
      return jsonError("Document not found.", 404);
    }

    let text = document.extractedText || "";
    if (languageCode !== "original") {
      const translation = await getTranslation(documentId, languageCode);
      if (!translation || translation.status !== "ready") {
        return jsonError("Translate before exporting this language.", 400);
      }
      text = translation.text;
    }

    const result = await exportDocumentText({
      documentId,
      guestId: ownerId,
      title: document.filename,
      text,
      format: format as ExportFormat,
      languageCode,
    });

    if (!result.downloadUrl) {
      const base64 = Buffer.from(result.bytes).toString("base64");
      return Response.json({
        ok: true as const,
        export: result.record,
        downloadUrl: null,
        dataUrl: `data:application/octet-stream;base64,${base64}`,
        filename: result.record.filename,
      });
    }

    return Response.json({
      ok: true as const,
      export: result.record,
      downloadUrl: result.downloadUrl,
      filename: result.record.filename,
    });
  } catch (cause) {
    return jsonError(
      cause instanceof Error ? cause.message : "Export failed.",
      400,
    );
  }
}
