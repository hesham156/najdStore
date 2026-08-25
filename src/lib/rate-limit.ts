/**
 * Minimal in-memory rate limiter (fixed window).
 *
 * Scope & limitation: state lives in this process's memory, so it protects a
 * single instance and resets on a cold start. That covers the common
 * single-instance deployment (e.g. Railway) and raises the cost of brute force
 * and abuse considerably. For a horizontally-scaled deployment, back this with a
 * shared store (Redis / Upstash) — the call sites stay the same.
 *
 * Keyed by client IP (never by account alone) so an attacker cannot lock a
 * victim out by burning their allowance.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the map cannot grow without bound.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  buckets.forEach((b, key) => {
    if (b.resetAt <= now) buckets.delete(key);
  });
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfter: number; // seconds until the window resets
}

/**
 * Consume one unit against `key`. Returns ok=false once `limit` is exceeded
 * within `windowMs`.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }
  return { ok: true, remaining: limit - existing.count, retryAfter: 0 };
}

/** Best-effort client IP from proxy headers, falling back to a constant. */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip") || "unknown";
}
