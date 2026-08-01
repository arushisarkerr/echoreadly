import type { AiRetryConfig } from "../types";

export type RetryDecision = {
  retry: boolean;
  delayMs: number;
  nextAttempt: number;
};

/**
 * Configurable retry policy for provider attempts.
 */
export class RetryManager {
  constructor(private config: AiRetryConfig) {}

  updateConfig(config: AiRetryConfig): void {
    this.config = { ...config };
  }

  get maxAttempts(): number {
    return this.config.maxAttempts;
  }

  /**
   * Decide whether to retry after a failed attempt (1-based attempt number just completed).
   */
  decide(input: {
    attempt: number;
    retryable: boolean;
  }): RetryDecision {
    if (!input.retryable || input.attempt >= this.config.maxAttempts) {
      return { retry: false, delayMs: 0, nextAttempt: input.attempt + 1 };
    }

    const exp = Math.min(
      this.config.maxDelayMs,
      this.config.baseDelayMs * 2 ** Math.max(0, input.attempt - 1),
    );
    const delayMs = this.config.jitter
      ? Math.floor(exp * (0.5 + Math.random() * 0.5))
      : exp;

    return {
      retry: true,
      delayMs,
      nextAttempt: input.attempt + 1,
    };
  }

  async wait(delayMs: number): Promise<void> {
    if (delayMs <= 0) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}
