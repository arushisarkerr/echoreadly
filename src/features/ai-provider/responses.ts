/**
 * Normalized AI Provider Layer responses.
 */

import type { AiCapability, AiProviderId } from "./types";

export type AiUsageStats = {
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  latencyMs: number;
  estimatedCostUsd?: number | null;
};

export type AiTextResponse = {
  kind: "text";
  text: string;
  providerId: AiProviderId;
  modelId: string;
  keyId: string;
  capability: AiCapability;
  usage: AiUsageStats;
  attempts: number;
};

export type AiTtsResponse = {
  kind: "tts";
  bytes: Uint8Array;
  mimeType: string;
  providerId: AiProviderId;
  modelId: string;
  keyId: string;
  capability: "tts";
  usage: AiUsageStats;
  attempts: number;
};

export type AiEmbeddingResponse = {
  kind: "embedding";
  vectors: number[][];
  dimensions: number;
  providerId: AiProviderId;
  modelId: string;
  keyId: string;
  capability: "embedding";
  usage: AiUsageStats;
  attempts: number;
};

export type AiOcrResponse = {
  kind: "ocr";
  text: string;
  pageCount?: number | null;
  providerId: AiProviderId;
  modelId: string;
  keyId: string;
  capability: "ocr";
  usage: AiUsageStats;
  attempts: number;
};

export type AiOrchestratorResponse =
  | AiTextResponse
  | AiTtsResponse
  | AiEmbeddingResponse
  | AiOcrResponse;

export type AiStreamChunk = {
  text: string;
  done: boolean;
  providerId: AiProviderId;
  modelId: string;
};
