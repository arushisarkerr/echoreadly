import { createServiceClient } from "@/lib/supabase/server";

export type SearchHit = {
  documentId: string;
  filename: string;
  sourceFormat: string | null;
  snippet: string;
  matchSource: "original" | "translation" | "chunk";
  languageCode: string;
};

/**
 * Full-text style search across originals, translations, and chunks.
 */
export async function searchLibrary(input: {
  guestId: string;
  query: string;
  limit?: number;
}): Promise<SearchHit[]> {
  const q = input.query.trim();
  if (!q) {
    return [];
  }

  const client = createServiceClient();
  const limit = input.limit ?? 30;
  const pattern = `%${q.replace(/[%_]/g, "")}%`;
  const hits: SearchHit[] = [];

  const { data: docs } = await client
    .from("documents")
    .select("id, filename, source_format, extracted_text")
    .eq("guest_id", input.guestId)
    .ilike("extracted_text", pattern)
    .limit(limit);

  for (const row of (docs as Array<Record<string, unknown>> | null) ?? []) {
    const text = String(row.extracted_text ?? "");
    hits.push({
      documentId: String(row.id),
      filename: String(row.filename),
      sourceFormat: (row.source_format as string | null) ?? null,
      snippet: snippetAround(text, q),
      matchSource: "original",
      languageCode: "original",
    });
  }

  const { data: translations } = await client
    .from("document_translations")
    .select("document_id, language_code, text, documents!inner(id, filename, source_format, guest_id)")
    .eq("documents.guest_id", input.guestId)
    .eq("status", "ready")
    .ilike("text", pattern)
    .limit(limit);

  for (const row of (translations as Array<Record<string, unknown>> | null) ?? []) {
    const doc = row.documents as Record<string, unknown>;
    hits.push({
      documentId: String(row.document_id),
      filename: String(doc.filename),
      sourceFormat: (doc.source_format as string | null) ?? null,
      snippet: snippetAround(String(row.text ?? ""), q),
      matchSource: "translation",
      languageCode: String(row.language_code),
    });
  }

  const { data: chunks } = await client
    .from("document_chunks")
    .select("document_id, text, documents!inner(id, filename, source_format, guest_id)")
    .eq("documents.guest_id", input.guestId)
    .ilike("text", pattern)
    .limit(limit);

  for (const row of (chunks as Array<Record<string, unknown>> | null) ?? []) {
    const doc = row.documents as Record<string, unknown>;
    const already = hits.some(
      (hit) =>
        hit.documentId === String(row.document_id) && hit.matchSource === "original",
    );
    if (already) {
      continue;
    }
    hits.push({
      documentId: String(row.document_id),
      filename: String(doc.filename),
      sourceFormat: (doc.source_format as string | null) ?? null,
      snippet: snippetAround(String(row.text ?? ""), q),
      matchSource: "chunk",
      languageCode: "original",
    });
  }

  return hits.slice(0, limit);
}

function snippetAround(text: string, query: string, radius = 80): string {
  const lower = text.toLowerCase();
  const index = lower.indexOf(query.toLowerCase());
  if (index < 0) {
    return text.slice(0, radius * 2);
  }
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + query.length + radius);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}
