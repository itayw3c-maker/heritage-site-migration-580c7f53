import { beforeEach, describe, expect, it } from "vitest";
import { containsHardBlockedMarkup, sanitizeArticleHtml } from "../html-sanitize.server";
import { rateLimit, audit, clientKey } from "../abuse-guard.server";
import {
  checkSubmissionGuard,
  recordSubmission,
  fingerprintLead,
  LEAD_GUARD_KEY,
  LEAD_MAX_PER_WINDOW,
  LEAD_DUPLICATE_COOLDOWN_MS,
} from "../anti-abuse";

describe("sanitizeArticleHtml — malicious payloads", () => {
  it("drops script tags with their content", () => {
    const out = sanitizeArticleHtml('<p>שלום</p><script>alert(1)</script>');
    expect(out.html).not.toMatch(/script/i);
    expect(out.html).toContain("שלום");
    expect(out.removedTags).toContain("script");
  });

  it("strips inline event handlers", () => {
    const out = sanitizeArticleHtml('<p onclick="steal()">טקסט</p>');
    expect(out.html).not.toMatch(/onclick/i);
    expect(out.removedAttributes).toContain("onclick");
  });

  it("blocks javascript: URLs", () => {
    const out = sanitizeArticleHtml('<a href="javascript:alert(1)">קישור</a>');
    expect(out.html).not.toMatch(/javascript:/i);
    expect(out.blockedUrls).toBeGreaterThan(0);
  });

  it("blocks obfuscated javascript URLs and data: HTML", () => {
    expect(sanitizeArticleHtml('<a href="JaVaScRiPt&#58;x">x</a>').html).not.toMatch(/javascript/i);
    expect(sanitizeArticleHtml('<img src="data:text/html;base64,PHN2Zz4=">').html).not.toContain(
      "data:text/html",
    );
  });

  it("removes iframes, forms, styles and svg payloads", () => {
    const out = sanitizeArticleHtml(
      '<iframe src="https://evil.test"></iframe><form action="x"><input></form><style>body{}</style><svg onload="x"></svg>',
    );
    expect(out.html.trim()).toBe("");
  });

  it("strips style attributes but keeps allowed markup", () => {
    const out = sanitizeArticleHtml(
      '<div class="tip" style="position:fixed"><ul><li>א</li></ul><img src="/a.png" alt="א"></div>',
    );
    expect(out.html).not.toMatch(/style=/);
    expect(out.html).toContain('class="tip"');
    expect(out.html).toContain("<li>א</li>");
    expect(out.html).toContain('alt="א"');
  });

  it("adds rel to outbound links and keeps safe hrefs", () => {
    const out = sanitizeArticleHtml('<a href="https://example.com/x">x</a>');
    expect(out.html).toContain('href="https://example.com/x"');
    expect(out.html).toContain("noopener");
  });

  it("flags hard-blocked markup", () => {
    expect(containsHardBlockedMarkup("<script>x</script>")).toBe(true);
    expect(containsHardBlockedMarkup("<p>נקי</p>")).toBe(false);
  });
});

describe("rateLimit — flood attempts", () => {
  it("allows up to the limit then rejects with retry-after", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 60_000).allowed).toBe(true);
    const blocked = rateLimit(key, 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("buckets clients separately and never exposes the raw IP", () => {
    const key = clientKey(
      new Request("https://x.test", { headers: { "cf-connecting-ip": "203.0.113.9" } }),
    );
    expect(key.startsWith("ip:")).toBe(true);
    expect(key).not.toContain("203.0.113.9");
  });
});

describe("audit logging", () => {
  it("never logs secrets or article HTML", () => {
    const lines: string[] = [];
    const original = console.info;
    console.info = (msg?: unknown) => void lines.push(String(msg));
    try {
      audit("publish.ok", {
        slug: "x",
        token: "super-secret",
        authorization: "Bearer abc",
        content_html: "<p>secret body</p>",
        html_bytes: 12,
      });
    } finally {
      console.info = original;
    }
    expect(lines.join()).not.toContain("super-secret");
    expect(lines.join()).not.toContain("Bearer");
    expect(lines.join()).not.toContain("secret body");
    expect(lines.join()).toContain("publish.ok");
  });
});

describe("lead anti-abuse guard", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
      },
    };
  });

  it("debounces an identical submission", () => {
    const fp = fingerprintLead(["דנה", "0501234567", null, null, "contact"]);
    expect(checkSubmissionGuard({ key: LEAD_GUARD_KEY, max: LEAD_MAX_PER_WINDOW, duplicateCooldownMs: LEAD_DUPLICATE_COOLDOWN_MS, fingerprint: fp }).ok).toBe(true);
    recordSubmission(LEAD_GUARD_KEY, fp);
    const second = checkSubmissionGuard({ key: LEAD_GUARD_KEY, max: LEAD_MAX_PER_WINDOW, duplicateCooldownMs: LEAD_DUPLICATE_COOLDOWN_MS, fingerprint: fp });
    expect(second.ok).toBe(false);
  });

  it("allows a different legitimate lead right away", () => {
    recordSubmission(LEAD_GUARD_KEY, fingerprintLead(["א", "0500000000"]));
    const other = checkSubmissionGuard({
      key: LEAD_GUARD_KEY,
      max: LEAD_MAX_PER_WINDOW,
      duplicateCooldownMs: LEAD_DUPLICATE_COOLDOWN_MS,
      fingerprint: fingerprintLead(["ב", "0511111111"]),
    });
    expect(other.ok).toBe(true);
  });

  it("stops a flood past the documented maximum", () => {
    for (let i = 0; i < LEAD_MAX_PER_WINDOW; i++) recordSubmission(LEAD_GUARD_KEY, `fp-${i}`);
    const blocked = checkSubmissionGuard({ key: LEAD_GUARD_KEY, max: LEAD_MAX_PER_WINDOW, fingerprint: "fp-new" });
    expect(blocked.ok).toBe(false);
    expect(blocked.ok === false && blocked.reason).toBe("flood");
  });

  it("stores no raw PII in the fingerprint", () => {
    expect(fingerprintLead(["דנה", "0501234567"])).not.toContain("0501234567");
  });
});
