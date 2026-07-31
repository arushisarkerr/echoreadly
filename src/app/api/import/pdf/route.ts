import {
  deletePdfFromSupabaseBucket,
  pdfExistsInSupabaseBucket,
  uploadPdfToSupabaseBucket,
} from "@/features/import/server/upload-pdf";

export const runtime = "nodejs";

const OWNER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const IDEMPOTENCY_KEY_PATTERN = OWNER_ID_PATTERN;

function jsonError(message: string, status: number) {
  return Response.json({ ok: false as const, error: message }, { status });
}

/**
 * Verify a previously uploaded PDF still exists in the `pdfs` bucket.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = (url.searchParams.get("path") ?? url.searchParams.get("storagePath") ?? "").trim();

  if (!path) {
    return jsonError("Missing storage path.", 400);
  }

  try {
    const exists = await pdfExistsInSupabaseBucket(path);
    return Response.json({ ok: true as const, exists });
  } catch (cause) {
    const message =
      cause instanceof Error && cause.message
        ? cause.message
        : "Unable to verify uploaded PDF.";
    return jsonError(message, 400);
  }
}

/**
 * PDF import upload endpoint — storage + library document in one success flow.
 * Accepts PDF, DOCX, EPUB, and TXT through the shared upload pipeline.
 * Rejects files whose content already exists in the owner's Library.
 * Same idempotency key retries the same attempt without creating a second row.
 */
export async function POST(request: Request) {
  let form: FormData;

  try {
    form = await request.formData();
  } catch {
    return jsonError("Invalid upload payload.", 400);
  }

  const fileEntry = form.get("file");
  const ownerIdEntry = form.get("ownerId");
  const idempotencyKeyEntry = form.get("idempotencyKey");
  const preferOcrEntry = form.get("preferOcr");
  const preferOcr =
    preferOcrEntry === "1" ||
    preferOcrEntry === "true" ||
    preferOcrEntry === "on";

  if (!(fileEntry instanceof File)) {
    return jsonError("Choose a file to import.", 400);
  }

  if (typeof ownerIdEntry !== "string" || !OWNER_ID_PATTERN.test(ownerIdEntry)) {
    return jsonError("Invalid upload owner id.", 400);
  }

  if (
    typeof idempotencyKeyEntry !== "string" ||
    !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKeyEntry)
  ) {
    return jsonError("Invalid upload idempotency key.", 400);
  }

  try {
    const result = await uploadPdfToSupabaseBucket(
      fileEntry,
      ownerIdEntry,
      idempotencyKeyEntry,
      { preferOcr },
    );
    return Response.json({ ok: true as const, result });
  } catch (cause) {
    const message =
      cause instanceof Error && cause.message
        ? cause.message
        : "Upload failed. Please try again.";
    return jsonError(message, 400);
  }
}

/**
 * Remove a previously uploaded PDF from storage and its document record.
 */
export async function DELETE(request: Request) {
  let body: { path?: unknown; storagePath?: unknown; ownerId?: unknown };

  try {
    body = (await request.json()) as {
      path?: unknown;
      storagePath?: unknown;
      ownerId?: unknown;
    };
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const path =
    typeof body.path === "string"
      ? body.path
      : typeof body.storagePath === "string"
        ? body.storagePath
        : "";

  if (!path.trim()) {
    return jsonError("Missing storage path.", 400);
  }

  const ownerId =
    typeof body.ownerId === "string" && OWNER_ID_PATTERN.test(body.ownerId)
      ? body.ownerId
      : undefined;

  try {
    await deletePdfFromSupabaseBucket(path.trim(), ownerId);
    return Response.json({ ok: true as const });
  } catch (cause) {
    const message =
      cause instanceof Error && cause.message
        ? cause.message
        : "Unable to remove uploaded PDF.";
    return jsonError(message, 400);
  }
}
