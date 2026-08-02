import type { AiCooldownConfig, AiProviderId, AiProviderStatus } from "../types";
import { DEFAULT_COOLDOWN_CONFIG } from "../config/defaults";

type HealthRecord = {
  status: AiProviderStatus;
  latencyMsEwma: number | null;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastError: string | null;
  lastCheckedAt: number | null;
  updatedAt: number;
  /** When set, provider is skipped until this time, then auto-recovers to degraded. */
  recoverAt: number | null;
};

/**
 * Tracks provider health for routing and dashboard (runtime state).
 * Transient failure statuses recover after a cooldown window so providers
 * are not permanently removed from routing.
 */
export class HealthManager {
  private readonly records = new Map<AiProviderId, HealthRecord>();
  private cooldown: AiCooldownConfig;

  constructor(cooldown: AiCooldownConfig = DEFAULT_COOLDOWN_CONFIG) {
    this.cooldown = { ...cooldown };
  }

  updateCooldown(cooldown: AiCooldownConfig): void {
    this.cooldown = { ...cooldown };
  }

  getStatus(providerId: AiProviderId): AiProviderStatus {
    this.maybeRecover(providerId);
    return this.ensure(providerId).status;
  }

  isUsable(providerId: AiProviderId): boolean {
    this.maybeRecover(providerId);
    const status = this.ensure(providerId).status;
    // Circuit breaker owns open/half-open gating — do not double-block here.
    if (status === "circuit_open") {
      return true;
    }
    return status === "healthy" || status === "degraded";
  }

  recordSuccess(providerId: AiProviderId, latencyMs: number): void {
    const record = this.ensure(providerId);
    record.consecutiveSuccesses += 1;
    record.consecutiveFailures = 0;
    record.lastError = null;
    record.recoverAt = null;
    record.lastCheckedAt = Date.now();
    record.updatedAt = Date.now();
    record.latencyMsEwma =
      record.latencyMsEwma == null
        ? latencyMs
        : record.latencyMsEwma * 0.7 + latencyMs * 0.3;
    record.status = record.consecutiveSuccesses >= 2 ? "healthy" : "degraded";
  }

  recordFailure(
    providerId: AiProviderId,
    status: Exclude<AiProviderStatus, "healthy">,
    message?: string,
  ): void {
    const record = this.ensure(providerId);
    record.consecutiveFailures += 1;
    record.consecutiveSuccesses = 0;
    record.lastError = message ?? null;
    record.lastCheckedAt = Date.now();
    record.updatedAt = Date.now();
    record.status = status;
    record.recoverAt =
      status === "circuit_open"
        ? null
        : Date.now() + this.recoveryMsFor(status);
  }

  markCircuitOpen(providerId: AiProviderId): void {
    this.recordFailure(providerId, "circuit_open", "Circuit breaker open");
  }

  markRecovered(providerId: AiProviderId): void {
    const record = this.ensure(providerId);
    record.status = "healthy";
    record.consecutiveFailures = 0;
    record.consecutiveSuccesses = 0;
    record.lastError = null;
    record.recoverAt = null;
    record.updatedAt = Date.now();
  }

  snapshot() {
    return [...this.records.keys()].map((providerId) => {
      this.maybeRecover(providerId);
      const record = this.ensure(providerId);
      return { providerId, ...record };
    });
  }

  private recoveryMsFor(
    status: Exclude<AiProviderStatus, "healthy">,
  ): number {
    switch (status) {
      case "rate_limited":
        return this.cooldown.rateLimitMs;
      case "quota_exceeded":
        return this.cooldown.quotaMs;
      case "auth_failed":
        return this.cooldown.authFailureMs;
      case "timeout":
      case "unavailable":
      case "degraded":
      case "circuit_open":
      default:
        return this.cooldown.genericFailureMs;
    }
  }

  private maybeRecover(providerId: AiProviderId, now = Date.now()): void {
    const record = this.ensure(providerId);
    if (record.status === "healthy" || record.status === "degraded") {
      return;
    }
    if (record.status === "circuit_open") {
      return;
    }
    if (record.recoverAt != null && record.recoverAt <= now) {
      record.status = "degraded";
      record.recoverAt = null;
      record.updatedAt = now;
    }
  }

  private ensure(providerId: AiProviderId): HealthRecord {
    let record = this.records.get(providerId);
    if (!record) {
      record = {
        status: "healthy",
        latencyMsEwma: null,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        lastError: null,
        lastCheckedAt: null,
        updatedAt: Date.now(),
        recoverAt: null,
      };
      this.records.set(providerId, record);
    }
    return record;
  }
}
