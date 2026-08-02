import type {
  AiCapability,
  AiCircuitBreakerConfig,
  AiCooldownConfig,
  AiFeatureRouting,
  AiModelDefinition,
  AiProviderDefinition,
  AiProviderLayerConfig,
  AiRetryConfig,
} from "../types";

export const DEFAULT_RETRY_CONFIG: AiRetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 250,
  maxDelayMs: 4000,
  jitter: true,
};

export const DEFAULT_COOLDOWN_CONFIG: AiCooldownConfig = {
  rateLimitMs: 30_000,
  quotaMs: 15 * 60_000,
  authFailureMs: 60 * 60_000,
  genericFailureMs: 10_000,
};

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: AiCircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  openMs: 60_000,
};

export const DEFAULT_PROVIDERS: AiProviderDefinition[] = [
  {
    id: "openai",
    displayName: "OpenAI",
    enabled: true,
    defaultPriority: 10,
    capabilities: [
      "chat",
      "summary",
      "translation",
      "tts",
      "embedding",
      "streaming",
      "audio",
      "vision",
    ],
  },
  {
    id: "gemini",
    displayName: "Google Gemini",
    enabled: true,
    defaultPriority: 20,
    capabilities: [
      "chat",
      "summary",
      "translation",
      "embedding",
      "streaming",
      "vision",
    ],
  },
  {
    id: "mistral",
    displayName: "Mistral",
    enabled: true,
    defaultPriority: 30,
    capabilities: ["chat", "summary", "translation", "embedding", "streaming"],
  },
  {
    id: "claude",
    displayName: "Anthropic Claude",
    enabled: false,
    defaultPriority: 40,
    capabilities: ["chat", "summary", "translation", "streaming", "vision"],
  },
  {
    id: "grok",
    displayName: "xAI Grok",
    enabled: false,
    defaultPriority: 50,
    capabilities: ["chat", "summary", "translation", "streaming"],
  },
  {
    id: "kimi",
    displayName: "Kimi",
    enabled: false,
    defaultPriority: 60,
    capabilities: ["chat", "summary", "translation", "streaming"],
  },
  {
    id: "tesseract",
    displayName: "Tesseract OCR",
    enabled: true,
    defaultPriority: 10,
    capabilities: ["ocr"],
  },
];

export const DEFAULT_MODELS: AiModelDefinition[] = [
  {
    id: "gpt-4o-mini",
    providerId: "openai",
    capabilities: ["chat", "summary", "translation", "streaming"],
    modality: "text",
    displayName: "GPT-4o mini",
  },
  {
    id: "gpt-4o",
    providerId: "openai",
    capabilities: ["chat", "summary", "translation", "streaming", "vision"],
    modality: "text",
    displayName: "GPT-4o",
  },
  {
    id: "tts-1",
    providerId: "openai",
    capabilities: ["tts", "audio"],
    modality: "speech",
    displayName: "TTS-1",
  },
  {
    id: "whisper-1",
    providerId: "openai",
    capabilities: ["audio"],
    modality: "audio",
    displayName: "Whisper-1",
  },
  {
    id: "text-embedding-3-small",
    providerId: "openai",
    capabilities: ["embedding"],
    modality: "embedding",
    displayName: "Embedding 3 Small",
  },
  {
    id: "gemini-2.0-flash",
    providerId: "gemini",
    capabilities: ["chat", "summary", "translation", "streaming", "vision"],
    modality: "text",
    displayName: "Gemini 2.0 Flash",
  },
  {
    id: "mistral-small-latest",
    providerId: "mistral",
    capabilities: ["chat", "summary", "translation", "streaming"],
    modality: "text",
    displayName: "Mistral Small",
  },
  {
    id: "tesseract-eng",
    providerId: "tesseract",
    capabilities: ["ocr"],
    modality: "image",
    displayName: "Tesseract English",
  },
];

export const DEFAULT_FEATURE_ROUTING: AiFeatureRouting[] = [
  {
    feature: "chat",
    providers: ["openai", "gemini"],
    models: {
      openai: "gpt-4o-mini",
      gemini: "gemini-2.0-flash",
    },
  },
  {
    feature: "summary",
    providers: ["openai", "gemini"],
    models: {
      openai: "gpt-4o-mini",
      gemini: "gemini-2.0-flash",
    },
  },
  {
    feature: "translation",
    providers: ["gemini", "openai", "claude", "mistral"],
    models: {
      gemini: "gemini-2.0-flash",
      openai: "gpt-4o-mini",
      mistral: "mistral-small-latest",
    },
  },
  {
    feature: "tts",
    providers: ["openai"],
    models: { openai: "tts-1" },
  },
  {
    feature: "embedding",
    providers: ["openai", "gemini", "mistral"],
    models: { openai: "text-embedding-3-small" },
  },
  {
    feature: "ocr",
    providers: ["tesseract"],
    models: { tesseract: "tesseract-eng" },
  },
  {
    feature: "streaming",
    providers: ["openai", "gemini", "claude", "mistral"],
  },
  {
    feature: "vision",
    providers: ["openai", "gemini", "claude"],
  },
  {
    feature: "audio",
    providers: ["openai"],
    models: { openai: "whisper-1" },
  },
];

export function buildEmptyLayerConfig(): AiProviderLayerConfig {
  return {
    defaultTextProvider: "openai",
    providers: DEFAULT_PROVIDERS,
    models: DEFAULT_MODELS,
    featureRouting: DEFAULT_FEATURE_ROUTING,
    keys: [],
    retry: DEFAULT_RETRY_CONFIG,
    cooldown: DEFAULT_COOLDOWN_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };
}

export const ALL_CAPABILITIES: AiCapability[] = [
  "chat",
  "summary",
  "translation",
  "tts",
  "embedding",
  "ocr",
  "streaming",
  "vision",
  "audio",
];
