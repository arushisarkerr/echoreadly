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
};

export type AiGenerateOutput = {
  text: string;
  model: string;
};

export type AiGenerateResult =
  | { ok: true; data: AiGenerateOutput }
  | { ok: false; error: AiError };

/**
 * Minimal text-generation contract shared by AI vendors.
 */
export interface AiProvider {
  readonly name: string;
  isConfigured(): boolean;
  generateText(input: AiGenerateInput): Promise<AiGenerateResult>;
}
