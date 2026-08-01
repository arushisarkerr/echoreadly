import { createServiceClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/ai/openai";
import {
  getAiProviderLayer,
  isAiProviderError,
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

/**
 * Chat (ask) — routed through the AI Provider Layer.
 * OpenAI → Gemini automatic fallback via Router / Orchestrator.
 */
async function runDocumentChat(input: {
  documentId: string;
  context: string;
  question: string;
}): Promise<{ result: string }> {
  const layer = getAiProviderLayer();
  const task = `Answer this question using only the document:\n${input.question}`;

  try {
    const response = await layer.orchestrator.execute({
      feature: "chat",
      documentId: input.documentId,
      system: DOCUMENT_AI_SYSTEM,
      input: `Document context:\n\n${input.context}\n\nTask:\n${task}`,
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
    throw cause instanceof Error
      ? cause
      : new Error("AI request failed.");
  }
}

/**
 * Run an AI action grounded in document chunks.
 * Phase 2: only `ask` (Chat) uses the Provider Layer.
 * Summary and other actions remain on the legacy OpenAI path until later phases.
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

  const context = contextFromChunks(chunks);

  const prompts: Record<AiAction, string> = {
    summary:
      "Write a clear, structured summary of the document. Use short paragraphs.",
    key_points:
      "Extract the essential key points as a concise bullet list.",
    quiz:
      "Create 5 short quiz questions with answers based only on the document.",
    flashcards:
      "Create 8 flashcards as Q:/A: pairs based only on the document.",
    explain:
      "Explain the main ideas in plain language for a general reader.",
    ask: input.question?.trim()
      ? `Answer this question using only the document:\n${input.question.trim()}`
      : "Answer questions about the document.",
  };

  if (input.action === "ask") {
    if (!input.question?.trim()) {
      throw new Error("Enter a question to ask about this document.");
    }
    return runDocumentChat({
      documentId: input.documentId,
      context,
      question: input.question.trim(),
    });
  }

  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_AI_MODEL?.trim() || "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: DOCUMENT_AI_SYSTEM,
      },
      {
        role: "user",
        content: `Document context:\n\n${context}\n\nTask:\n${prompts[input.action]}`,
      },
    ],
  });

  const result = completion.choices[0]?.message?.content?.trim() || "";
  if (!result) {
    throw new Error("AI did not return a result.");
  }
  return { result };
}
