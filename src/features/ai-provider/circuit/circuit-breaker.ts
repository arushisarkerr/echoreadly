import type { AiCircuitBreakerConfig, AiProviderId } from "../types";

type CircuitState = "closed" | "open" | "half_open";

type CircuitRecord = {
  state: CircuitState;
  failures: number;
  successes: number;
  openedAt: number | null;
};

/**
 * Per-provider circuit breaker to shed load from failing providers.
 */
export class CircuitBreaker {
  private readonly records = new Map<AiProviderId, CircuitRecord>();
  private config: AiCircuitBreakerConfig;

  constructor(config: AiCircuitBreakerConfig) {
    this.config = { ...config };
  }

  updateConfig(config: AiCircuitBreakerConfig): void {
    this.config = { ...config };
  }

  canRequest(providerId: AiProviderId, now = Date.now()): boolean {
    const record = this.ensure(providerId);
    if (record.state === "closed") {
      return true;
    }
    if (record.state === "open") {
      if (record.openedAt != null && now - record.openedAt >= this.config.openMs) {
        record.state = "half_open";
        record.successes = 0;
        return true;
      }
      return false;
    }
    // half_open: allow probe
    return true;
  }

  recordSuccess(providerId: AiProviderId): void {
    const record = this.ensure(providerId);
    if (record.state === "half_open") {
      record.successes += 1;
      if (record.successes >= this.config.successThreshold) {
        record.state = "closed";
        record.failures = 0;
        record.successes = 0;
        record.openedAt = null;
      }
      return;
    }
    record.failures = 0;
    record.state = "closed";
  }

  recordFailure(providerId: AiProviderId): void {
    const record = this.ensure(providerId);
    if (record.state === "half_open") {
      record.state = "open";
      record.openedAt = Date.now();
      record.failures = this.config.failureThreshold;
      record.successes = 0;
      return;
    }
    record.failures += 1;
    if (record.failures >= this.config.failureThreshold) {
      record.state = "open";
      record.openedAt = Date.now();
    }
  }

  getState(providerId: AiProviderId): CircuitState {
    return this.ensure(providerId).state;
  }

  snapshot() {
    return [...this.records.entries()].map(([providerId, record]) => ({
      providerId,
      ...record,
    }));
  }

  private ensure(providerId: AiProviderId): CircuitRecord {
    let record = this.records.get(providerId);
    if (!record) {
      record = {
        state: "closed",
        failures: 0,
        successes: 0,
        openedAt: null,
      };
      this.records.set(providerId, record);
    }
    return record;
  }
}
