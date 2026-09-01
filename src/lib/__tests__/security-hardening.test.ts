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

describe("sanitizeArticleHtml — encoded and malformed XSS variants", () => {
  const cases: Array<[string, string]> = [
    ["decimal-entity javascript", '<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;alert(1)">x</a>'],
    ["hex-entity javascript", '<a href="&#x6a;avascript&#x3a;alert(1)">x</a>'],
    ["tab/newline split scheme", '<a href="java\tscript:alert(1)">x</a>'],
    ["null byte in scheme", '<a href="java\u0000script:alert(1)">x</a>'],
    ["leading whitespace scheme", '<a href="   javascript:alert(1)">x</a>'],
    ["mixed case vbscript", '<a href="VbScRiPt:msgbox(1)">x</a>'],
    ["unclosed script tag", '<p>טקסט</p><script>alert(1)'],
    ["broken attribute quoting", '<img src=x onerror=alert(1)>'],
    ["nested/obfuscated script", '<scr<script>ipt>alert(1)</script>'],
    ["uppercase tag with handler", '<DIV ONMOUSEOVER="alert(1)">x</DIV>'],
    ["svg onload payload", '<svg/onload=alert(1)>'],
    ["style expression", '<div style="background:url(javascript:alert(1))">x</div>'],
    ["meta refresh", '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">'],
    ["base tag hijack", '<base href="https://evil.test/">'],
    ["srcset javascript", '<img srcset="javascript:alert(1) 1x">'],
    ["form action hijack", '<form action="javascript:alert(1)"><input name="a"></form>'],
    ["iframe srcdoc", '<iframe srcdoc="<script>alert(1)</script>"></iframe>'],
    ["object data", '<object data="javascript:alert(1)"></object>'],
    ["html comment breakout", '<!--<script>alert(1)</script>-->'],
    ["data:text/html image", '<img src="data:text/html,<script>alert(1)</script>">'],
  ];

  for (const [name, payload] of cases) {
    it(`neutralises ${name}`, () => {
      const out = sanitizeArticleHtml(payload).html;
      expect(out.toLowerCase()).not.toContain("javascript:");
      expect(out.toLowerCase()).not.toContain("vbscript:");
      expect(out.toLowerCase()).not.toMatch(/<\s*script/);
      expect(out.toLowerCase()).not.toMatch(/<\s*(svg|iframe|object|form|meta|base|input)/);
      expect(out.toLowerCase()).not.toMatch(/on[a-z]+\s*=/);
      expect(out.toLowerCase()).not.toContain("data:text/html");
      // Escaped leftover *text* is inert; what must never survive is an
      // executable construct — a tag or attribute carrying the payload.
      expect(out).not.toMatch(/<[^>]*alert\(1\)/);
    });
  }

  it("keeps legitimate Hebrew article markup intact", () => {
    const out = sanitizeArticleHtml(
      '<h2>נזקי מים</h2><p dir="rtl">טקסט עם <a href="https://www.rrshamaut.co.il/x/">קישור</a></p><ul><li>סעיף</li></ul><img src="/wp-content/a.jpg" alt="נזק">',
    ).html;
    expect(out).toContain("<h2>נזקי מים</h2>");
    expect(out).toContain('href="https://www.rrshamaut.co.il/x/"');
    expect(out).toContain("<li>סעיף</li>");
    expect(out).toContain('alt="נזק"');
  });

  it("accepts an inline base64 raster image but not other data URLs", () => {
    const ok = sanitizeArticleHtml(
      '<img src="data:image/png;base64,iVBORw0KGgo=" alt="x">',
    ).html;
    expect(ok).toContain("data:image/png;base64,");
    const bad = sanitizeArticleHtml('<img src="data:application/xml;base64,PHg+" alt="x">').html;
    expect(bad).not.toContain("data:application");
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


  it("does not consume the guard when the send fails (no lost lead)", () => {
    // recordSubmission is called by the caller ONLY after a successful insert,
    // so a failed attempt leaves no state and an immediate retry is allowed.
    const fp = fingerprintLead(["דנה", "0501234567"]);
    const opts = {
      key: LEAD_GUARD_KEY,
      max: LEAD_MAX_PER_WINDOW,
      duplicateCooldownMs: LEAD_DUPLICATE_COOLDOWN_MS,
      fingerprint: fp,
    };
    expect(checkSubmissionGuard(opts).ok).toBe(true); // attempt 1 -> network error
    expect(checkSubmissionGuard(opts).ok).toBe(true); // immediate retry allowed
    expect(checkSubmissionGuard(opts).ok).toBe(true);
    recordSubmission(LEAD_GUARD_KEY, fp); // succeeded at last
    expect(checkSubmissionGuard(opts).ok).toBe(false); // now debounced
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
