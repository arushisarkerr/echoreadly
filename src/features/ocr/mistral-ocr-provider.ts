/**
 * Mistral OCR provider.
 * Calls POST https://api.mistral.ai/v1/ocr via the official SDK.
 * Not wired into the PDFium extraction pipeline yet.
 */

import { Mistral } from "@mistralai/mistralai";
import { MistralError } from "@mistralai/mistralai/models/errors";

import { assertServerRuntime } from "@/utils/server";

import type { OcrExtractResult, OcrProvider } from "./ocr-provider";
import { OcrProviderError, type OcrErrorCode } from "./types";

const DEFAULT_OCR_MODEL = "mistral-ocr-latest";

export type MistralOcrProviderOptions = {
  /** Overrides `MISTRAL_API_KEY` when provided. */
  apiKey?: string;
  /** Defaults to `mistral-ocr-latest`. */
  model?: string;
};

function resolveApiKey(explicit?: string): string | undefined {
  const fromOptions = explicit?.trim();
  if (fromOptions) {
    return fromOptions;
  }
  const fromEnv = process.env.MISTRAL_API_KEY?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : undefined;
}

function classifyMistralError(error: unknown): OcrProviderError {
  if (error instanceof OcrProviderError) {
    return error;
  }

  if (error instanceof MistralError) {
    const status = error.statusCode;
    let code: OcrErrorCode = "api_error";

    if (status === 401 || status === 403) {
      code = "missing_api_key";
    } else if (status === 429) {
      code = "rate_limit";
    } else if (status === 400 || status === 415 || status === 422) {
      code = "invalid_pdf";
    }

    return new OcrProviderError({
      code,
      message: error.message || "Mistral OCR request failed.",
      status,
    });
  }

  const message =
    error instanceof Error ? error.message : "An unexpected OCR error occurred.";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("fetch failed") ||
    normalized.includes("network") ||
    normalized.includes("econnreset") ||
    normalized.includes("etimedout")
  ) {
    return new OcrProviderError({
      code: "network_error",
      message,
    });
  }

  return new OcrProviderError({
    code: "api_error",
    message,
  });
}

function averageConfidence(
  pages: Array<{
    confidenceScores?: {
      averagePageConfidenceScore: number;
    } | null;
  }>,
): number | undefined {
  const scores = pages
    .map((page) => page.confidenceScores?.averagePageConfidenceScore)
    .filter((score): score is number => typeof score === "number");

  if (scores.length === 0) {
    return undefined;
  }

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

/**
 * Mistral implementation of {@link OcrProvider}.
 */
export class MistralOcrProvider implements OcrProvider {
  readonly name = "mistral";

  private readonly apiKey: string | undefined;
  private readonly model: string;
  private client: Mistral | null = null;

  constructor(options: MistralOcrProviderOptions = {}) {
    assertServerRuntime("MistralOcrProvider");
    this.apiKey = resolveApiKey(options.apiKey);
    this.model = options.model?.trim() || DEFAULT_OCR_MODEL;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  private getClient(): Mistral {
    if (!this.apiKey) {
      throw new OcrProviderError({
        code: "missing_api_key",
        message:
          "Mistral API key is not configured. Set MISTRAL_API_KEY in .env.local.",
      });
    }

    if (!this.client) {
      this.client = new Mistral({ apiKey: this.apiKey });
    }

    return this.client;
  }

  async extractPdf(buffer: Buffer): Promise<OcrExtractResult> {
    if (!Buffer.isBuffer(buffer) || buffer.byteLength === 0) {
      throw new OcrProviderError({
        code: "invalid_pdf",
        message: "OCR requires a non-empty PDF buffer.",
      });
    }

    const client = this.getClient();
    let uploadedFileId: string | null = null;

    try {
      const uploaded = await client.files.upload({
        file: {
          fileName: "document.pdf",
          content: buffer,
        },
        purpose: "ocr",
      });
      uploadedFileId = uploaded.id;

      const response = await client.ocr.process({
        model: this.model,
        document: {
          type: "file",
          fileId: uploaded.id,
        },
        // Page-level confidence when available; omitted scores → undefined.
        confidenceScoresGranularity: "page",
      });

      const sortedPages = [...response.pages].sort((a, b) => a.index - b.index);
      const pageTexts = sortedPages.map((page) => page.markdown ?? "");
      const fullText = pageTexts
        .map((text) => text.trim())
        .filter((text) => text.length > 0)
        .join("\n\n");

      if (pageTexts.length === 0 || fullText.length === 0) {
        throw new OcrProviderError({
          code: "empty_result",
          message: "Mistral OCR returned no readable text for this PDF.",
        });
      }

      return {
        pageTexts,
        fullText,
        confidence: averageConfidence(sortedPages),
      };
    } catch (error) {
      throw classifyMistralError(error);
    } finally {
      if (uploadedFileId) {
        try {
          await client.files.delete({ fileId: uploadedFileId });
        } catch {
          // Best-effort cleanup; do not mask OCR success/failure.
        }
      }
    }
  }
}

/**
 * Factory for the Mistral OCR provider.
 */
export function createMistralOcrProvider(
  options: MistralOcrProviderOptions = {},
): OcrProvider {
  return new MistralOcrProvider(options);
}
