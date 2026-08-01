import type { AiProviderId, AiProviderStatus } from "../types";

type HealthRecord = {
  status: AiProviderStatus;
  latencyMsEwma: number | null;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastError: string | null;
  lastCheckedAt: number | null;
  updatedAt: number;
};

/**
 * Tracks provider health for routing and dashboard (runtime state).
 */
export class HealthManager {
  private readonly records = new Map<AiProviderId, HealthRecord>();

  getStatus(providerId: AiProviderId): AiProviderStatus {
    return this.ensure(providerId).status;
  }

  isUsable(providerId: AiProviderId): boolean {
    const status = this.getStatus(providerId);
    return status === "healthy" || status === "degraded";
  }

  recordSuccess(providerId: AiProviderId, latencyMs: number): void {
    const record = this.ensure(providerId);
    record.consecutiveSuccesses += 1;
    record.consecutiveFailures = 0;
    record.lastError = null;
    record.lastCheckedAt = Date.now();
    record.updatedAt = Date.now();
    record.latencyMsEwma =
      record.latencyMsEwma == null
        ? latencyMs
        : record.latencyMsEwma * 0.7 + latencyMs * 0.3;
    if (record.status === "circuit_open") {
      return;
    }
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
    record.updatedAt = Date.now();
  }

  snapshot() {
    return [...this.records.entries()].map(([providerId, record]) => ({
      providerId,
      ...record,
    }));
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
      };
      this.records.set(providerId, record);
    }
    return record;
  }
}
