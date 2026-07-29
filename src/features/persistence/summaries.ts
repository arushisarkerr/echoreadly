/**
 * Document summary persistence (Supabase `document_summaries` table).
 * Uses the authenticated user client only — never the service role.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { SummaryResult, SummaryType } from "@/features/ai";
import type { CitedSection } from "@/features/citations";
import { createClient } from "@/lib/supabase/server";

import type {
  DocumentSummaryRow,
  PersistSummaryInput,
  PersistenceResult,
} from "./types";

async function resolveClient(client?: SupabaseClient) {
  return client ?? (await createClient());
}

function normalizeCitations(value: unknown): CitedSection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const record = entry as { text?: unknown; pages?: unknown };
      if (typeof record.text !== "string" || !record.text.trim()) {
        return null;
      }

      const pages = Array.isArray(record.pages)
        ? record.pages.filter(
            (page): page is number =>
              typeof page === "number" && Number.isInteger(page) && page >= 1,
          )
        : [];

      return {
        text: record.text.trim(),
        pages,
      } satisfies CitedSection;
    })
    .filter((entry): entry is CitedSection => entry !== null);
}

export function summaryRowToResult(row: DocumentSummaryRow): SummaryResult {
  const citations = normalizeCitations(row.citations);

  return {
    documentId: row.document_id,
    summaryType: row.summary_type,
    content: row.content,
    sections: citations,
    generatedAt: row.generated_at,
    model: row.model,
  };
}

export async function getDocumentSummaryByType(
  documentId: string,
  userId: string,
  summaryType: SummaryType,
  client?: SupabaseClient,
): Promise<PersistenceResult<DocumentSummaryRow | null>> {
  try {
    const supabase = await resolveClient(client);
    const { data, error } = await supabase
      .from("document_summaries")
      .select("*")
      .eq("document_id", documentId)
      .eq("user_id", userId)
      .eq("summary_type", summaryType)
      .maybeSingle();

    if (error) {
      return { ok: false, error: error.message };
    }

    if (!data) {
      return { ok: true, data: null };
    }

    return {
      ok: true,
      data: {
        ...(data as Omit<DocumentSummaryRow, "citations">),
        citations: normalizeCitations(
          (data as { citations?: unknown }).citations,
        ),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to load summary.",
    };
  }
}

/**
 * Insert or update a summary for a document + summary type.
 */
export async function upsertDocumentSummary(
  input: PersistSummaryInput,
  client?: SupabaseClient,
): Promise<PersistenceResult<DocumentSummaryRow>> {
  try {
    const supabase = await resolveClient(client);
    const generatedAt = input.generatedAt ?? new Date().toISOString();

    const { data, error } = await supabase
      .from("document_summaries")
      .upsert(
        {
          document_id: input.documentId,
          user_id: input.userId,
          summary_type: input.summaryType,
          content: input.content,
          citations: input.citations,
          model: input.model,
          generated_at: generatedAt,
        },
        { onConflict: "document_id,summary_type" },
      )
      .select("*")
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message || "Unable to save summary.",
      };
    }

    return {
      ok: true,
      data: {
        ...(data as Omit<DocumentSummaryRow, "citations">),
        citations: normalizeCitations(
          (data as { citations?: unknown }).citations,
        ),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to save summary.",
    };
  }
}
