import type { AiCooldownConfig, AiKeyRecord, AiKeyStatus, AiProviderId } from "../types";
import type { CooldownManager } from "../cooldown/cooldown-manager";

export type KeySelection = {
  key: AiKeyRecord;
  status: AiKeyStatus;
};

type KeyRuntimeState = {
  failureCount: number;
  successCount: number;
  lastUsedAt: number;
  disabledUntil: number | null;
  permanentlyDisabled: boolean;
};

/**
 * Selects API keys across an unlimited pool with priority, weight, LRU, and health.
 */
export class KeyManager {
  private keys: AiKeyRecord[] = [];
  private readonly state = new Map<string, KeyRuntimeState>();

  constructor(
    keys: AiKeyRecord[],
    private readonly cooldown: CooldownManager,
    private readonly cooldownConfig: AiCooldownConfig,
  ) {
    this.replaceKeys(keys);
  }

  replaceKeys(keys: AiKeyRecord[]): void {
    this.keys = keys.map((key) => ({ ...key }));
    for (const key of this.keys) {
      if (!this.state.has(key.id)) {
        this.state.set(key.id, {
          failureCount: 0,
          successCount: 0,
          lastUsedAt: 0,
          disabledUntil: null,
          permanentlyDisabled: false,
        });
      }
    }
  }

  listForProvider(providerId: AiProviderId): AiKeyRecord[] {
    return this.keys
      .filter((key) => key.providerId === providerId && key.enabled)
      .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  }

  getSecret(keyId: string): string | null {
    return this.keys.find((key) => key.id === keyId)?.secret ?? null;
  }

  getStatus(keyId: string): AiKeyStatus {
    const key = this.keys.find((entry) => entry.id === keyId);
    if (!key || !key.enabled) {
      return "disabled";
    }
    const runtime = this.ensureState(keyId);
    if (runtime.permanentlyDisabled) {
      return "disabled";
    }
    if (runtime.disabledUntil && runtime.disabledUntil > Date.now()) {
      return "disabled";
    }
    if (this.cooldown.isCoolingDown(keyId)) {
      const reason = this.cooldown.getReason(keyId);
      if (reason === "quota") {
        return "quota_exceeded";
      }
      if (reason === "auth") {
        return "auth_failed";
      }
      return "cooldown";
    }
    return "healthy";
  }

  /**
   * Pick the next usable key for a provider (priority → weight → least recently used).
   */
  selectKey(providerId: AiProviderId): KeySelection | null {
    const candidates = this.listForProvider(providerId)
      .map((key) => ({ key, status: this.getStatus(key.id) }))
      .filter((entry) => entry.status === "healthy");

    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((a, b) => {
      if (a.key.priority !== b.key.priority) {
        return a.key.priority - b.key.priority;
      }
      if (b.key.weight !== a.key.weight) {
        return b.key.weight - a.key.weight;
      }
      const aUsed = this.ensureState(a.key.id).lastUsedAt;
      const bUsed = this.ensureState(b.key.id).lastUsedAt;
      return aUsed - bUsed;
    });

    const selected = candidates[0];
    this.ensureState(selected.key.id).lastUsedAt = Date.now();
    return selected;
  }

  recordSuccess(keyId: string): void {
    const runtime = this.ensureState(keyId);
    runtime.successCount += 1;
    runtime.failureCount = Math.max(0, runtime.failureCount - 1);
  }

  recordFailure(
    keyId: string,
    kind: "rate_limit" | "quota" | "auth" | "generic" = "generic",
  ): void {
    const runtime = this.ensureState(keyId);
    runtime.failureCount += 1;

    if (kind === "auth") {
      this.cooldown.start(keyId, this.cooldownConfig.authFailureMs, "auth");
      return;
    }
    if (kind === "quota") {
      this.cooldown.start(keyId, this.cooldownConfig.quotaMs, "quota");
      return;
    }
    if (kind === "rate_limit") {
      this.cooldown.start(keyId, this.cooldownConfig.rateLimitMs, "rate_limit");
      return;
    }
    this.cooldown.start(keyId, this.cooldownConfig.genericFailureMs, "generic");
  }

  disableTemporarily(keyId: string, durationMs: number): void {
    this.ensureState(keyId).disabledUntil = Date.now() + durationMs;
  }

  disablePermanently(keyId: string): void {
    this.ensureState(keyId).permanentlyDisabled = true;
  }

  snapshot(providerId?: AiProviderId) {
    return this.keys
      .filter((key) => (providerId ? key.providerId === providerId : true))
      .map((key) => ({
        id: key.id,
        providerId: key.providerId,
        priority: key.priority,
        weight: key.weight,
        enabled: key.enabled,
        status: this.getStatus(key.id),
        failureCount: this.ensureState(key.id).failureCount,
        successCount: this.ensureState(key.id).successCount,
        lastUsedAt: this.ensureState(key.id).lastUsedAt || null,
        // Never expose secret.
      }));
  }

  private ensureState(keyId: string): KeyRuntimeState {
    let runtime = this.state.get(keyId);
    if (!runtime) {
      runtime = {
        failureCount: 0,
        successCount: 0,
        lastUsedAt: 0,
        disabledUntil: null,
        permanentlyDisabled: false,
      };
      this.state.set(keyId, runtime);
    }
    return runtime;
  }
}
