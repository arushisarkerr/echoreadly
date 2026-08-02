/**
 * TEMPORARY TTS provider-resolution debug logging.
 * Never logs secrets. Remove once routing is confirmed.
 */

import type { AdapterRegistry } from "../adapters/types";
import type { KeyManager } from "../keys/key-manager";
import type { ProviderRouter } from "../router/provider-router";
import type { AiCapability, AiProviderId } from "../types";

const PREFIX = "[TTS DEBUG]";

export type TtsProviderProbe = {
  provider: AiProviderId;
  capability: AiCapability;
  enabled: boolean;
  healthy: boolean;
  hasApiKey: boolean;
  hasTtsAdapter: boolean;
  model: string | null;
  skipReason: string | null;
};

function envFlag(name: string): string {
  const value = process.env[name];
  if (value == null || !String(value).trim()) {
    return "(unset)";
  }
  return String(value).trim();
}

function envSecretExists(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

/**
 * Probe every configured TTS provider and print resolution details.
 * Does not change routing or selection behavior.
 */
export function logTtsProviderResolution(input: {
  router: ProviderRouter;
  keys: KeyManager;
  adapters: AdapterRegistry;
  preferredProviderId?: AiProviderId;
  preferredModelId?: string;
}): TtsProviderProbe[] {
  const capability: AiCapability = "tts";
  const requireAdapter = true;

  const configured = input.router.configuredProviders(capability);
  const preferredFirst = input.preferredProviderId
    ? [
        input.preferredProviderId,
        ...configured.filter((id) => id !== input.preferredProviderId),
      ]
    : configured;

  const resolved = input.router
    .route(capability, {
      preferredProviderId: input.preferredProviderId,
      preferredModelId: input.preferredModelId,
      requireAdapter,
    })
    .map((candidate) => candidate.providerId);

  console.info(PREFIX);
  console.info(`${PREFIX} OPENAI_ENABLED=${envFlag("OPENAI_ENABLED")}`);
  console.info(`${PREFIX} TTS_PROVIDER=${envFlag("TTS_PROVIDER")}`);
  console.info(
    `${PREFIX} TTS_PROVIDER_ORDER=${envFlag("TTS_PROVIDER_ORDER")}`,
  );
  console.info(
    `${PREFIX} OPENAI_API_KEY exists? ${envSecretExists("OPENAI_API_KEY")}`,
  );
  console.info(
    `${PREFIX} OPENAI_KEY_1 exists? ${envSecretExists("OPENAI_KEY_1")}`,
  );
  console.info(
    `${PREFIX} OPENAI_KEY_2 exists? ${envSecretExists("OPENAI_KEY_2")}`,
  );
  console.info(
    `${PREFIX} Resolved providers=${JSON.stringify(resolved)}`,
  );

  const probes: TtsProviderProbe[] = preferredFirst.map((providerId) => {
    const probe = input.router.probeProvider(providerId, capability, {
      preferredModelId: input.preferredModelId,
      requireAdapter,
      hasApiKey: input.keys.listForProvider(providerId).length > 0,
      hasTtsAdapter: Boolean(
        input.adapters.get(providerId)?.synthesizeSpeech,
      ),
    });

    console.info(`${PREFIX} Provider: ${probe.provider}`);
    console.info(`${PREFIX} Capability: ${probe.capability}`);
    console.info(`${PREFIX} Enabled: ${probe.enabled}`);
    console.info(`${PREFIX} Healthy: ${probe.healthy}`);
    console.info(`${PREFIX} Has API key: ${probe.hasApiKey}`);
    console.info(`${PREFIX} Has TTS adapter: ${probe.hasTtsAdapter}`);
    console.info(`${PREFIX} Model: ${probe.model ?? "(none)"}`);
    console.info(
      `${PREFIX} Skip reason: ${probe.skipReason ?? "(none — usable)"}`,
    );
    console.info(`${PREFIX} ---`);

    return probe;
  });

  return probes;
}

export function logTtsNoUsableProvider(probes: TtsProviderProbe[]): void {
  console.info(
    `${PREFIX} No usable AI provider for capability tts`,
  );
  for (const probe of probes) {
    console.info(
      `${PREFIX} skip: ${probe.provider} → ${probe.skipReason ?? "(none)"}`,
    );
  }
}
