/**
 * In-Memory Sliding Window Rate Limiter
 * Provides DDoS, spam voting, and report submission flooding protection without external Redis dependency.
 */

interface RateBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, RateBucket>();

export interface RateLimitOptions {
  intervalMs: number; // e.g. 60_000 (1 minute)
  maxTokens: number;  // e.g. 10 requests
}

export type RateLimitInput =
  | string
  | {
      key: string;
      maxRequests?: number;
      windowSeconds?: number;
      maxTokens?: number;
      intervalMs?: number;
    };

/**
 * Checks whether an incoming key (e.g. IP or userId) has exceeded rate limits.
 */
export function checkRateLimit(
  input: RateLimitInput,
  options?: RateLimitOptions
): { allowed: boolean; remaining: number; resetMs: number; retryAfterSeconds: number } {
  let actualKey: string;
  let maxTokens = options?.maxTokens ?? 10;
  let intervalMs = options?.intervalMs ?? 60_000;

  if (typeof input === "object" && input !== null) {
    actualKey = input.key;
    if (input.maxRequests !== undefined) maxTokens = input.maxRequests;
    if (input.maxTokens !== undefined) maxTokens = input.maxTokens;
    if (input.windowSeconds !== undefined) intervalMs = input.windowSeconds * 1000;
    if (input.intervalMs !== undefined) intervalMs = input.intervalMs;
  } else {
    actualKey = input;
  }

  const now = Date.now();
  let bucket = buckets.get(actualKey);

  if (!bucket) {
    bucket = { tokens: maxTokens, lastRefill: now };
    buckets.set(actualKey, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill;
  if (elapsed >= intervalMs) {
    bucket.tokens = maxTokens;
    bucket.lastRefill = now;
  } else {
    const refillAmount = (elapsed / intervalMs) * maxTokens;
    bucket.tokens = Math.min(maxTokens, bucket.tokens + refillAmount);
    bucket.lastRefill = now;
  }

  const resetMs = Math.max(0, intervalMs - (now - bucket.lastRefill));
  const retryAfterSeconds = Math.ceil(resetMs / 1000);

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      resetMs,
      retryAfterSeconds,
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetMs,
    retryAfterSeconds,
  };
}

export function resetRateLimit(key?: string): void {
  if (key) {
    buckets.delete(key);
  } else {
    buckets.clear();
  }
}

/**
 * Periodically cleans up stale buckets every 5 minutes to prevent memory leaks.
 */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (now - bucket.lastRefill > 300_000) {
        buckets.delete(key);
      }
    }
  }, 300_000);
}
