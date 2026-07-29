/**
 * In-memory rate limiting by IP and authenticated user.
 * Suitable for single-instance public beta; replace with Redis for multi-instance.
 */

export type RateLimitBucket = "upload" | "summarize" | "chat" | "tts";

export type RateLimitConfig = {
  /** Max requests per window for an authenticated user. */
  userLimit: number;
  /** Max requests per window for a client IP. */
  ipLimit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

export const RATE_LIMITS: Record<RateLimitBucket, RateLimitConfig> = {
  upload: {
    userLimit: 20,
    ipLimit: 40,
    windowMs: 60 * 60 * 1000,
  },
  summarize: {
    userLimit: 30,
    ipLimit: 60,
    windowMs: 60 * 60 * 1000,
  },
  chat: {
    userLimit: 60,
    ipLimit: 120,
    windowMs: 60 * 60 * 1000,
  },
  tts: {
    userLimit: 30,
    ipLimit: 60,
    windowMs: 60 * 60 * 1000,
  },
};

type Counter = {
  count: number;
  resetAt: number;
};

const counters = new Map<string, Counter>();

function getCounter(key: string, windowMs: number, now: number): Counter {
  const existing = counters.get(key);

  if (!existing || existing.resetAt <= now) {
    const next = { count: 0, resetAt: now + windowMs };
    counters.set(key, next);
    return next;
  }

  return existing;
}

export type RateLimitResult =
  | {
      ok: true;
      remaining: number;
      resetAt: number;
    }
  | {
      ok: false;
      retryAfterSeconds: number;
      resetAt: number;
      limitedBy: "user" | "ip";
    };

export type EnforceRateLimitInput = {
  bucket: RateLimitBucket;
  userId: string;
  ip: string;
};

/**
 * Enforce both per-user and per-IP limits for a bucket.
 */
export function enforceRateLimit(input: EnforceRateLimitInput): RateLimitResult {
  const config = RATE_LIMITS[input.bucket];
  const now = Date.now();

  const userKey = `${input.bucket}:user:${input.userId}`;
  const ipKey = `${input.bucket}:ip:${input.ip || "unknown"}`;

  const userCounter = getCounter(userKey, config.windowMs, now);
  const ipCounter = getCounter(ipKey, config.windowMs, now);

  if (userCounter.count >= config.userLimit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((userCounter.resetAt - now) / 1000),
      ),
      resetAt: userCounter.resetAt,
      limitedBy: "user",
    };
  }

  if (ipCounter.count >= config.ipLimit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((ipCounter.resetAt - now) / 1000),
      ),
      resetAt: ipCounter.resetAt,
      limitedBy: "ip",
    };
  }

  userCounter.count += 1;
  ipCounter.count += 1;

  return {
    ok: true,
    remaining: Math.min(
      config.userLimit - userCounter.count,
      config.ipLimit - ipCounter.count,
    ),
    resetAt: Math.min(userCounter.resetAt, ipCounter.resetAt),
  };
}

/**
 * Extract a best-effort client IP from a Request.
 */
export function getRequestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

/** Test helper — clears the in-memory store. */
export function resetRateLimitStore(): void {
  counters.clear();
}
