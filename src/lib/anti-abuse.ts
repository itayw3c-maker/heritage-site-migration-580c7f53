// Client-side, graduated anti-abuse guards for the two public write paths
// (contact leads and page ratings). Application layer only — no database
// policy or schema is involved.
//
// Documented limits, deliberately far above real human behaviour so a
// legitimate lead is never blocked:
//   leads   : 1 identical submission per 60s, max 5 submissions / 30 min
//   ratings : 1 vote per page (existing localStorage guard) + max 10 votes
//             / 30 min across the whole site
//
// State lives in sessionStorage/localStorage; it is a friction layer against
// accidental double-taps and naive scripted floods, not a security boundary.

const WINDOW_MS = 30 * 60 * 1000;

interface Entry {
  at: number;
  fingerprint?: string;
}

function read(key: string): Entry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Entry[];
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - WINDOW_MS;
    return parsed.filter((e) => typeof e?.at === "number" && e.at > cutoff);
  } catch {
    return [];
  }
}

function write(key: string, entries: Entry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(entries.slice(-20)));
  } catch {
    /* storage disabled — fail open, never block a real lead */
  }
}

export type GuardResult =
  | { ok: true }
  | { ok: false; reason: "duplicate" | "flood"; retryAfterSeconds: number };

export interface GuardOptions {
  key: string;
  max: number;
  /** Minimum gap between two submissions with the same fingerprint. */
  duplicateCooldownMs?: number;
  fingerprint?: string;
}

export function checkSubmissionGuard(options: GuardOptions): GuardResult {
  const { key, max, duplicateCooldownMs = 0, fingerprint } = options;
  const entries = read(key);
  const now = Date.now();

  if (fingerprint && duplicateCooldownMs > 0) {
    const last = [...entries].reverse().find((e) => e.fingerprint === fingerprint);
    if (last && now - last.at < duplicateCooldownMs) {
      return {
        ok: false,
        reason: "duplicate",
        retryAfterSeconds: Math.ceil((duplicateCooldownMs - (now - last.at)) / 1000),
      };
    }
  }

  if (entries.length >= max) {
    const oldest = entries[0]!.at;
    return {
      ok: false,
      reason: "flood",
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000)),
    };
  }
  return { ok: true };
}

export function recordSubmission(key: string, fingerprint?: string): void {
  const entries = read(key);
  entries.push({ at: Date.now(), ...(fingerprint ? { fingerprint } : {}) });
  write(key, entries);
}

export const LEAD_GUARD_KEY = "rr-guard:leads";
export const RATING_GUARD_KEY = "rr-guard:ratings";
export const LEAD_MAX_PER_WINDOW = 5;
export const LEAD_DUPLICATE_COOLDOWN_MS = 60 * 1000;
export const RATING_MAX_PER_WINDOW = 10;

/** Short, non-reversible fingerprint of a lead payload (no PII stored raw). */
export function fingerprintLead(parts: Array<string | null | undefined>): string {
  const source = parts.map((p) => (p ?? "").trim().toLowerCase()).join("|");
  let hash = 0;
  for (let i = 0; i < source.length; i++) hash = (hash * 31 + source.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}
