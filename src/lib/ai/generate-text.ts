/**
 * Provider-agnostic text generation for translation / document AI.
 * Honors AI_PROVIDER: gemini | mistral | openai (default).
 */

export type GenerateTextInput = {
  system: string;
  user: string;
  temperature?: number;
};

type AiProviderId = "gemini" | "mistral" | "openai";

function configuredProvider(): AiProviderId {
  const raw = (process.env.AI_PROVIDER || "openai").trim().toLowerCase();
  if (raw === "gemini" || raw === "google") {
    return "gemini";
  }
  if (raw === "mistral") {
    return "mistral";
  }
  return "openai";
}

function billingOrQuotaMessage(status: number | null, body: string): string | null {
  const normalized = `${status ?? ""} ${body}`.toLowerCase();
  const isBilling =
    normalized.includes("insufficient_quota") ||
    normalized.includes("billing") ||
    normalized.includes("exceeded your current quota") ||
    normalized.includes("payment required") ||
    (status === 429 &&
      (normalized.includes("quota") ||
        normalized.includes("credit") ||
        normalized.includes("billing") ||
        normalized.includes("resource_exhausted")));

  if (isBilling || (status === 429 && normalized.includes("quota"))) {
    return "Your AI provider returned a billing error (429). Please add API credits or configure another provider.";
  }
  if (status === 429) {
    return "Your AI provider rate-limited this request (429). Try again shortly or configure another provider.";
  }
  return null;
}

function throwProviderError(
  provider: AiProviderId,
  status: number | null,
  body: string,
): never {
  const mapped = billingOrQuotaMessage(status, body);
  if (mapped) {
    throw new Error(mapped);
  }
  const snippet = body.trim().slice(0, 280) || "Unknown provider error.";
  throw new Error(`${provider} request failed${status ? ` (${status})` : ""}: ${snippet}`);
}

async function generateWithGemini(input: GenerateTextInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Add it to .env.local or set AI_PROVIDER to another provider.",
    );
  }

  const model =
    process.env.GEMINI_TRANSLATE_MODEL?.trim() ||
    process.env.GEMINI_MODEL?.trim() ||
    "gemini-2.0-flash";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: input.system }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: input.user }],
        },
      ],
      generationConfig: {
        temperature: input.temperature ?? 0.2,
      },
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    throwProviderError("gemini", response.status, raw);
  }

  let payload: {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  try {
    payload = JSON.parse(raw) as typeof payload;
  } catch {
    throw new Error("Gemini returned an invalid response.");
  }

  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned empty text.");
  }
  return text;
}

async function generateWithMistral(input: GenerateTextInput): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "MISTRAL_API_KEY is not configured. Add it to .env.local or set AI_PROVIDER to another provider.",
    );
  }

  const model =
    process.env.MISTRAL_TRANSLATE_MODEL?.trim() ||
    process.env.MISTRAL_MODEL?.trim() ||
    "mistral-small-latest";

  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: input.temperature ?? 0.2,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    throwProviderError("mistral", response.status, raw);
  }

  let payload: { choices?: Array<{ message?: { content?: string } }> };
  try {
    payload = JSON.parse(raw) as typeof payload;
  } catch {
    throw new Error("Mistral returned an invalid response.");
  }

  const text = payload.choices?.[0]?.message?.content?.trim() || "";
  if (!text) {
    throw new Error("Mistral returned empty text.");
  }
  return text;
}

async function generateWithOpenAI(input: GenerateTextInput): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Add it to .env.local or set AI_PROVIDER to gemini or mistral.",
    );
  }

  const model =
    process.env.OPENAI_TRANSLATE_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4o-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: input.temperature ?? 0.2,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    throwProviderError("openai", response.status, raw);
  }

  let payload: { choices?: Array<{ message?: { content?: string } }> };
  try {
    payload = JSON.parse(raw) as typeof payload;
  } catch {
    throw new Error("OpenAI returned an invalid response.");
  }

  const text = payload.choices?.[0]?.message?.content?.trim() || "";
  if (!text) {
    throw new Error("OpenAI returned empty text.");
  }
  return text;
}

/**
 * Generate plain text using the configured AI_PROVIDER.
 */
export async function generateText(input: GenerateTextInput): Promise<string> {
  const provider = configuredProvider();
  if (provider === "gemini") {
    return generateWithGemini(input);
  }
  if (provider === "mistral") {
    return generateWithMistral(input);
  }
  return generateWithOpenAI(input);
}

export function getConfiguredAiProvider(): AiProviderId {
  return configuredProvider();
}
