import { createServiceClient } from "@/lib/supabase/server";
import {
  getAiProviderLayer,
  isAiProviderError,
  type AiCapability,
} from "@/features/ai-provider";

export type DocumentChunkRow = {
  chunkIndex: number;
  text: string;
  characterCount: number;
};

export async function listChunksForDocument(
  documentId: string,
): Promise<DocumentChunkRow[]> {
  const client = createServiceClient();
  const { data, error } = await client
    .from("document_chunks")
    .select("chunk_index, text, character_count")
    .eq("document_id", documentId)
    .order("chunk_index", { ascending: true });

  if (error) {
    throw new Error(error.message || "Unable to load document chunks.");
  }

  return ((data as Array<{
    chunk_index: number;
    text: string;
    character_count: number;
  }> | null) ?? []).map((row) => ({
    chunkIndex: row.chunk_index,
    text: row.text,
    characterCount: row.character_count,
  }));
}

function contextFromChunks(chunks: DocumentChunkRow[], maxChars = 12000): string {
  let used = 0;
  const parts: string[] = [];
  for (const chunk of chunks) {
    if (used >= maxChars) {
      break;
    }
    const slice = chunk.text.slice(0, maxChars - used);
    parts.push(slice);
    used += slice.length;
  }
  return parts.join("\n\n");
}

export type AiAction =
  | "summary"
  | "key_points"
  | "quiz"
  | "flashcards"
  | "explain"
  | "ask";

const DOCUMENT_AI_SYSTEM =
  "You help readers understand documents. Use only the provided document context. If the answer is not in the context, say so.";

function taskPromptForAction(action: AiAction, question?: string): string {
  switch (action) {
    case "summary":
      return "Write a clear, structured summary of the document. Use short paragraphs.";
    case "key_points":
      return "Extract the essential key points as a concise bullet list.";
    case "quiz":
      return "Create 5 short quiz questions with answers based only on the document.";
    case "flashcards":
      return "Create 8 flashcards as Q:/A: pairs based only on the document.";
    case "explain":
      return "Explain the main ideas in plain language for a general reader.";
    case "ask":
      return question?.trim()
        ? `Answer this question using only the document:\n${question.trim()}`
        : "Answer questions about the document.";
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

/**
 * Document-grounded text generation via the AI Provider Layer.
 * Chat uses capability `chat`; all other document AI uses `summary` routing.
 */
async function runGroundedDocumentAi(input: {
  documentId: string;
  context: string;
  task: string;
  capability: Extract<AiCapability, "chat" | "summary">;
}): Promise<{ result: string }> {
  const layer = getAiProviderLayer();

  try {
    const response = await layer.orchestrator.execute({
      feature: input.capability,
      documentId: input.documentId,
      system: DOCUMENT_AI_SYSTEM,
      input: `Document context:\n\n${input.context}\n\nTask:\n${input.task}`,
      temperature: 0.3,
    });

    if (response.kind !== "text" || !response.text.trim()) {
      throw new Error("AI did not return a result.");
    }
    return { result: response.text.trim() };
  } catch (cause) {
    if (isAiProviderError(cause)) {
      throw new Error(cause.message);
    }
    throw cause instanceof Error ? cause : new Error("AI request failed.");
  }
}

/**
 * Run an AI action grounded in document chunks.
 * Phase 2: Chat (`ask`) → capability `chat`.
 * Phase 3: Summary / key points / explain / quiz / flashcards → capability `summary`.
 * Both use Orchestrator + OpenAI → Gemini fallback. No direct provider SDK calls.
 */
export async function runDocumentAi(input: {
  documentId: string;
  action: AiAction;
  question?: string;
}): Promise<{ result: string }> {
  const chunks = await listChunksForDocument(input.documentId);
  if (chunks.length === 0) {
    throw new Error("Document has no chunks yet. Wait for processing to finish.");
  }

  if (input.action === "ask" && !input.question?.trim()) {
    throw new Error("Enter a question to ask about this document.");
  }

  const context = contextFromChunks(chunks);
  const task = taskPromptForAction(input.action, input.question);
  const capability: Extract<AiCapability, "chat" | "summary"> =
    input.action === "ask" ? "chat" : "summary";

  return runGroundedDocumentAi({
    documentId: input.documentId,
    context,
    task,
    capability,
  });
}
