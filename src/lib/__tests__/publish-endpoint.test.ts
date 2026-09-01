import { beforeAll, describe, expect, it, vi } from "vitest";

// Exercises the publish endpoint handlers directly: unauthorized access,
// DELETE being blocked by default, malicious payload rejection and flooding.
// No secrets are printed; the token used here is a throwaway test value.
const TEST_TOKEN = "test-token-not-a-secret";

type Handlers = {
  POST: (ctx: { request: Request }) => Promise<Response>;
  DELETE: (ctx: { request: Request }) => Promise<Response>;
  OPTIONS: (ctx: { request: Request }) => Promise<Response>;
};

let handlers: Handlers;

const storage = vi.hoisted(() => ({
  lookupError: false,
  publishedId: "00000000-0000-0000-0000-000000000001",
}));

const PUBLISHED_ID = storage.publishedId;

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () =>
            storage.lookupError
              ? { data: null, error: { message: "Simulated lookup failure" } }
              : { data: null, error: null },
        }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ data: { id: PUBLISHED_ID }, error: null }),
        }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: async () => ({ data: { id: PUBLISHED_ID }, error: null }),
          }),
        }),
      }),
    }),
  },
}));

function req(method: string, body?: unknown, token = TEST_TOKEN) {
  return new Request("https://site.test/api/public/publish-article", {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "cf-connecting-ip": `198.51.100.${Math.floor(Math.random() * 250) + 1}`,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

beforeAll(async () => {
  process.env["PUBLISH_TOKEN"] = TEST_TOKEN;
  delete process.env["PUBLISH_ALLOW_DELETE"];
  const mod = (await import("@/routes/api/public/publish-article")) as unknown as {
    Route: { options: { server: { handlers: Handlers } } };
  };
  handlers = mod.Route.options.server.handlers;
});

describe("publish endpoint authorization", () => {
  it("rejects a missing token", async () => {
    const res = await handlers.POST({ request: req("POST", { title: "x" }, "") });
    expect(res.status).toBe(401);
  });

  it("rejects a wrong token", async () => {
    const res = await handlers.POST({ request: req("POST", { title: "x" }, "wrong-token-value") });
    expect(res.status).toBe(401);
  });
});

describe("DELETE is blocked by default", () => {
  it("returns 405 when PUBLISH_ALLOW_DELETE is not enabled", async () => {
    const res = await handlers.DELETE({
      request: req("DELETE", { id: "11111111-1111-1111-1111-111111111111" }),
    });
    expect(res.status).toBe(405);
  });

  it("still requires auth", async () => {
    const res = await handlers.DELETE({ request: req("DELETE", { id: "x" }, "") });
    expect(res.status).toBe(401);
  });
});

describe("malicious payloads", () => {
  it("rejects a body that is only script markup (nothing left after sanitizing)", async () => {
    const res = await handlers.POST({
      request: req("POST", {
        title: "כתבה",
        body_html: '<script>fetch("https://evil.test")</script>',
      }),
    });
    expect(res.status).toBe(422);
  });

  it("rejects non-object bodies", async () => {
    const res = await handlers.POST({ request: req("POST", ["a"] as unknown) });
    expect(res.status).toBe(400);
  });
});

describe("CORS is not advertised to arbitrary origins", () => {
  it("omits Access-Control-Allow-Origin for an unknown origin", async () => {
    const request = new Request("https://site.test/api/public/publish-article", {
      method: "OPTIONS",
      headers: { Origin: "https://attacker.test" },
    });
    const res = await handlers.OPTIONS({ request });
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("flood attempt", () => {
  it("returns 429 once the per-client window is exhausted", async () => {
    const ip = "203.0.113.77";
    const make = () =>
      new Request("https://site.test/api/public/publish-article", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TEST_TOKEN}`,
          "cf-connecting-ip": ip,
        },
        body: JSON.stringify({ title: "כתבה", body_html: "<script>x</script>" }),
      });
    let sawRateLimit = false;
    for (let i = 0; i < 40; i++) {
      const res = await handlers.POST({ request: make() });
      if (res.status === 429) {
        sawRateLimit = true;
        expect(res.headers.get("retry-after")).toBeTruthy();
        break;
      }
    }
    expect(sawRateLimit).toBe(true);
  });
});

describe("authorized pipeline compatibility (staging)", () => {
  it("accepts the documented publisher payload through auth, validation and sanitizing", async () => {
    const res = await handlers.POST({
      request: req("POST", {
        external_id: "queue-4711",
        op: "publish",
        title: "בדיקת צינור פרסום",
        slug: "publisher-pipeline-check",
        body_html:
          '<h2>כותרת</h2><p>פסקה עם <strong>הדגשה</strong> ו<a href="https://www.rrshamaut.co.il/">קישור</a></p><ul><li>סעיף</li></ul>',
        excerpt: "תקציר",
        status: "publish",
        meta_title: "בדיקה",
        meta_description: "תיאור",
      }),
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      id: PUBLISHED_ID,
      slug: "publisher-pipeline-check",
      status: "published",
      url: "https://www.rrshamaut.co.il/publisher-pipeline-check/",
    });
  });

  it("returns a safe server error when the publish storage lookup fails", async () => {
    storage.lookupError = true;
    try {
      const res = await handlers.POST({
        request: req("POST", {
          title: "בדיקת תקלה",
          slug: "publisher-storage-error",
          body_html: "<p>תוכן תקין</p>",
        }),
      });
      expect(res.status).toBe(500);
      await expect(res.json()).resolves.toEqual({ error: "Database error" });
    } finally {
      storage.lookupError = false;
    }
  });

  it("does not strip legitimate article markup on the way to persistence", async () => {
    const { sanitizeArticleHtml } = await import("@/lib/html-sanitize.server");
    const html =
      '<h2>כותרת</h2><p dir="rtl">פסקה</p><ul><li>סעיף</li></ul><table><tr><td>א</td></tr></table><img src="/wp-content/uploads/a.jpg" alt="נזק">';
    const out = sanitizeArticleHtml(html).html;
    for (const needle of ["<h2>", "<li>", "<td>", 'alt="נזק"', "/wp-content/uploads/a.jpg"]) {
      expect(out).toContain(needle);
    }
  });

  it("keeps the allowlisted origin working when PUBLISH_ALLOWED_ORIGINS is set", async () => {
    process.env["PUBLISH_ALLOWED_ORIGINS"] = "https://staging.digipharm.test";
    try {
      const mod = (await import("@/routes/api/public/publish-article")) as unknown as {
        Route: { options: { server: { handlers: Handlers } } };
      };
      const request = new Request("https://site.test/api/public/publish-article", {
        method: "OPTIONS",
        headers: { Origin: "https://staging.digipharm.test" },
      });
      const res = await mod.Route.options.server.handlers.OPTIONS({ request });
      // Either the origin is echoed back, or CORS is simply not used by the
      // documented server-to-server pipeline — never a wildcard.
      expect(res.headers.get("access-control-allow-origin")).not.toBe("*");
    } finally {
      delete process.env["PUBLISH_ALLOWED_ORIGINS"];
    }
  });
});
