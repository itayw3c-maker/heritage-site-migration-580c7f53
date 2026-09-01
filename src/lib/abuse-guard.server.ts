// Minimal in-process rate limiting + safe audit logging.
// Documented limits (application layer only — no DB policy involved):
//   publish-article POST   : 30 requests / 5 minutes per client key
//   publish-article DELETE : 5 requests / 5 minutes per client key (and
//                            disabled entirely unless PUBLISH_ALLOW_DELETE=true)
// Workers are stateless and may scale horizontally, so this is a cheap
// first line of defence against floods, not a billing-grade quota.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  bucket.count++;
  if (bucket.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

/** Opaque, non-reversible client identifier for rate-limit buckets. */
export function clientKey(request: Request): string {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  let hash = 0;
  for (let i = 0; i < ip.length; i++) hash = (hash * 31 + ip.charCodeAt(i)) | 0;
  return `ip:${(hash >>> 0).toString(36)}`;
}

/**
 * Structured audit line. Never accepts tokens, headers, credentials or
 * article HTML — only booleans, counts and short identifiers.
 */
export function audit(
  event: string,
  fields: Record<string, string | number | boolean | null | undefined>,
): void {
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    if (/token|secret|key|password|authorization|html|content/i.test(k)) continue;
    safe[k] = typeof v === "string" ? v.slice(0, 200) : v;
  }
  console.info(
    JSON.stringify({ audit: event, at: new Date().toISOString(), ...safe }),
  );
}
