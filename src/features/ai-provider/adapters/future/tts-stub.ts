/**
 * Future TTS provider adapter contract placeholder.
 *
 * Phase 5 ships OpenAI TTS only. Additional providers implement
 * `synthesizeSpeech` on AiProviderAdapter, register via the layer,
 * and are selected by config routing — no TTS feature code changes.
 *
 * Example registration (later):
 *   layer.registerAdapter(createFutureTtsAdapter());
 *   // and add provider id to featureRouting.tts.providers
 */

import type { AiProviderAdapter } from "../types";

/**
 * Not registered by default. Kept as a compile-time reminder that
 * multi-provider TTS is supported by the adapter interface.
 */
export function createFutureTtsAdapterStub(providerId: string): AiProviderAdapter {
  return {
    providerId,
    async synthesizeSpeech() {
      throw new Error(
        `TTS provider "${providerId}" is not configured. Register a real adapter before enabling it in routing.`,
      );
    },
  };
}
