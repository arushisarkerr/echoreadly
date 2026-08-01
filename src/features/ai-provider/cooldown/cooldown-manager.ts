type CooldownReason = "rate_limit" | "quota" | "auth" | "generic";

type CooldownEntry = {
  until: number;
  reason: CooldownReason;
};

/**
 * Temporary skip window for keys (and optionally providers) after failures.
 */
export class CooldownManager {
  private readonly entries = new Map<string, CooldownEntry>();

  start(id: string, durationMs: number, reason: CooldownReason): void {
    const until = Date.now() + Math.max(0, durationMs);
    const existing = this.entries.get(id);
    if (existing && existing.until > until) {
      return;
    }
    this.entries.set(id, { until, reason });
  }

  clear(id: string): void {
    this.entries.delete(id);
  }

  isCoolingDown(id: string, now = Date.now()): boolean {
    const entry = this.entries.get(id);
    if (!entry) {
      return false;
    }
    if (entry.until <= now) {
      this.entries.delete(id);
      return false;
    }
    return true;
  }

  getReason(id: string): CooldownReason | null {
    if (!this.isCoolingDown(id)) {
      return null;
    }
    return this.entries.get(id)?.reason ?? null;
  }

  remainingMs(id: string, now = Date.now()): number {
    const entry = this.entries.get(id);
    if (!entry) {
      return 0;
    }
    return Math.max(0, entry.until - now);
  }

  snapshot() {
    const now = Date.now();
    return [...this.entries.entries()]
      .filter(([, entry]) => entry.until > now)
      .map(([id, entry]) => ({
        id,
        reason: entry.reason,
        remainingMs: entry.until - now,
      }));
  }
}
