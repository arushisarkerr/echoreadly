import type { DocumentChunkResult } from "@/features/processing/document-chunks";
import { CHAT_CITATION_FORMAT } from "@/features/citations";

import type { ChatHistoryItem } from "./types";

export const NOT_FOUND_IN_DOCUMENT =
  "I couldn't find that information in this document.";

export const DEFAULT_CHAT_MAX_OUTPUT_TOKENS = 1100;

function clampHistory(history: ChatHistoryItem[], maxItems: number) {
  if (history.length <= maxItems) return history;
  return history.slice(history.length - maxItems);
}

export function buildChatInstructions(): string {
  return [
    "You are EchoReadly, a precise reading assistant.",
    "Answer the user's question using ONLY the provided Context excerpts.",
    "Do not use outside knowledge.",
    "If the answer is not explicitly present in the Context, reply with EXACTLY:",
    `"${NOT_FOUND_IN_DOCUMENT}"`,
    "",
    "Rules:",
    "- Keep the answer concise and directly relevant.",
    "- If the user asks to rephrase or summarize something, do so using the Context text.",
    "",
    CHAT_CITATION_FORMAT,
  ].join("\n");
}

export function formatChatContext(chunksResult: DocumentChunkResult): string {
  const chunks = chunksResult.chunks;

  // The UI already chunks roughly by size; this is defensive.
  const maxChars = 150_000;
  let out = "";

  for (const chunk of chunks) {
    const block = `[Page ${chunk.pageNumber}, Chunk ${chunk.chunkIndex + 1}]\n${chunk.text}\n\n`;
    if (out.length + block.length > maxChars) break;
    out += block;
  }

  return out.trim();
}

export function buildChatInput(params: {
  context: string;
  history: ChatHistoryItem[];
  question: string;
}): string {
  const history = clampHistory(params.history, 10);

  const conversation = history
    .map((m) => (m.role === "user" ? `User: ${m.content}` : `Assistant: ${m.content}`))
    .join("\n\n");

  return [
    "Context excerpts (use these only). Each excerpt is labeled with its page number:",
    params.context || "(No extracted text available.)",
    "",
    conversation ? `Conversation so far:\n${conversation}\n` : "",
    `User question:\n${params.question}`,
    "",
    "Respond with the required JSON object:",
  ].join("\n");
}
