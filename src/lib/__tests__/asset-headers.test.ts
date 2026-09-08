import { describe, expect, it } from "vitest";
import { makeSlashRedirectPermanent, withAssetHeaders } from "@/lib/asset-headers";

function assetResponse(contentType?: string, cacheControl?: string) {
  const headers = new Headers();
  if (contentType) headers.set("content-type", contentType);
  if (cacheControl) headers.set("cache-control", cacheControl);
  return new Response("body", { status: 200, headers });
}

describe("withAssetHeaders caching", () => {
  it("caches migrated WordPress uploads for a year", () => {
    const out = withAssetHeaders(
      "/wp-content/uploads/2025/12/hero.webp",
      assetResponse("image/webp"),
    );
    expect(out.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
  });

  it("caches fonts and build assets", () => {
    for (const path of ["/fonts/assistant-hebrew.woff2", "/assets/index-abc123.js"]) {
      const out = withAssetHeaders(path, assetResponse("application/octet-stream"));
      expect(out.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    }
  });

  it("leaves HTML documents alone", () => {
    const out = withAssetHeaders("/about/", assetResponse("text/html; charset=utf-8"));
    expect(out.headers.get("cache-control")).toBeNull();
  });

  it("does not override a cache-control the host already set", () => {
    const out = withAssetHeaders(
      "/wp-content/uploads/2025/12/hero.webp",
      assetResponse("image/webp", "public, max-age=60"),
    );
    expect(out.headers.get("cache-control")).toBe("public, max-age=60");
  });

  it("does not cache error responses", () => {
    const out = withAssetHeaders(
      "/wp-content/uploads/missing.webp",
      new Response("nope", { status: 404 }),
    );
    expect(out.headers.get("cache-control")).toBeNull();
  });
});

describe("withAssetHeaders content types", () => {
  it("corrects the woff2 type the host mislabels as octet-stream", () => {
    const out = withAssetHeaders(
      "/fonts/assistant-hebrew.woff2",
      assetResponse("application/octet-stream"),
    );
    expect(out.headers.get("content-type")).toBe("font/woff2");
  });

  it("keeps a content type the host already got right", () => {
    const out = withAssetHeaders(
      "/wp-content/uploads/2025/12/hero.webp",
      assetResponse("image/webp"),
    );
    expect(out.headers.get("content-type")).toBe("image/webp");
  });

  it("does not invent a type for unknown extensions", () => {
    const out = withAssetHeaders(
      "/wp-content/uploads/report.bin",
      assetResponse("application/octet-stream"),
    );
    expect(out.headers.get("content-type")).toBe("application/octet-stream");
  });

  it("preserves the body", async () => {
    const out = withAssetHeaders("/fonts/x.woff2", assetResponse("application/octet-stream"));
    await expect(out.text()).resolves.toBe("body");
  });
});

describe("makeSlashRedirectPermanent", () => {
  function redirect(from: string, to: string, status = 307) {
    return {
      request: new Request(`https://www.rrshamaut.co.il${from}`),
      response: new Response(null, { status, headers: { location: to } }),
    };
  }

  it("upgrades a trailing-slash 307 to a 308", () => {
    const { request, response } = redirect("/about", "https://www.rrshamaut.co.il/about/");
    expect(makeSlashRedirectPermanent(request, response).status).toBe(308);
  });

  it("handles a relative location header", () => {
    const { request, response } = redirect("/jobs", "/jobs/");
    expect(makeSlashRedirectPermanent(request, response).status).toBe(308);
  });

  it("leaves redirects that change the path alone", () => {
    const { request, response } = redirect("/old-page", "/new-page/");
    expect(makeSlashRedirectPermanent(request, response).status).toBe(307);
  });

  it("leaves cross-origin redirects alone", () => {
    const { request, response } = redirect("/out", "https://example.com/out/");
    expect(makeSlashRedirectPermanent(request, response).status).toBe(307);
  });

  it("leaves file-like paths temporary so a later upload is not blocked", () => {
    for (const path of ["/fonts/missing.woff2", "/wp-content/uploads/gone.png", "/robots.txt"]) {
      const { request, response } = redirect(path, `${path}/`);
      expect(makeSlashRedirectPermanent(request, response).status).toBe(307);
    }
  });

  it("still upgrades page paths that merely contain a dot", () => {
    const { request, response } = redirect("/about/v1.2-guide", "/about/v1.2-guide/");
    expect(makeSlashRedirectPermanent(request, response).status).toBe(308);
  });

  it("does not touch other redirect codes", () => {
    const { request, response } = redirect("/about", "/about/", 302);
    expect(makeSlashRedirectPermanent(request, response).status).toBe(302);
  });
});
