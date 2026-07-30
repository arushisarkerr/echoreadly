/**
 * Provider-agnostic AI abstraction.
 * Business logic should depend on this interface, not vendor SDKs.
 */

import type { AiError } from "./types";

export type AiGenerateInput = {
  instructions: string;
  input: string;
  model?: string;
  maxOutputTokens?: number;
  /** Abort in-flight generation (streaming or buffered). */
  signal?: AbortSignal;
  /**
   * Gemini response shape. Chat/summary use JSON; translation uses plain text.
   * OpenAI ignores this and follows the prompt.
   */
  responseFormat?: "json" | "text";
};

export type AiGenerateOutput = {
  text: string;
  model: string;
};

export type AiGenerateResult =
  | { ok: true; data: AiGenerateOutput }
  | { ok: false; error: AiError };

export type AiStreamChunk =
  | { type: "delta"; text: string }
  | { type: "done"; text: string; model: string }
  | { type: "error"; error: AiError };

/**
 * Minimal text-generation contract shared by AI vendors.
 */
export interface AiProvider {
  readonly name: string;
  isConfigured(): boolean;
  generateText(input: AiGenerateInput): Promise<AiGenerateResult>;
  /**
   * Optional token stream. Providers without streaming fall back via
   * `streamTextOrGenerate` helpers that emit a single delta then done.
   */
  streamText?(input: AiGenerateInput): AsyncGenerator<AiStreamChunk, void, void>;
}
