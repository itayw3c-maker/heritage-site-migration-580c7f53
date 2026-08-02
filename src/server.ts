import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Edge HTML cache
//
// TanStack Start / h3 emits `cache-control: no-cache, must-revalidate,
// max-age=0` on every SSR document, so Cloudflare never stores the HTML and
// each request pays a full SSR render (TTFB 700-1300ms) — the LCP ceiling.
// All public document routes are static (content comes from
// public/content/*.json, nothing per-user), so we rewrite the header AND
// store the response in the Cloudflare Cache API (a bare Cache-Control
// header alone does not make CF cache HTML without a Cache Rule).
// FixDigital number swap and Trustindex are client-side, so they are
// unaffected by a cached document.
// ---------------------------------------------------------------------------
const HTML_CACHE_CONTROL = "public, s-maxage=600, stale-while-revalidate=86400";

function isCacheableDocumentRequest(request: Request): boolean {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  const p = url.pathname;
  if (p.startsWith("/admin")) return false;
  if (p.startsWith("/api/")) return false;
  if (p.startsWith("/_serverFn")) return false;
  if (p.startsWith("/lovable/")) return false;
  // Authenticated/preview traffic must never be shared.
  if (request.headers.get("authorization")) return false;
  const cookie = request.headers.get("cookie") ?? "";
  if (/sb-[^=]*-auth-token/.test(cookie)) return false;
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/html");
}

function isCacheableDocumentResponse(response: Response): boolean {
  if (response.status !== 200) return false;
  return (response.headers.get("content-type") ?? "").includes("text/html");
}

// Cloudflare adds __cf_bm (Bot Management) per-client; it must never be shared
// through a cached document, but it must not block caching either. Session /
// auth cookies DO block caching.
const BLOCKING_COOKIE = /(^|;|\s)(sb-[^=]*-auth-token|session|__Secure|__Host)/i;

function hasBlockingSetCookie(response: Response): boolean {
  const all = typeof (response.headers as unknown as { getSetCookie?: () => string[] })
    .getSetCookie === "function"
    ? (response.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
    : [response.headers.get("set-cookie") ?? ""];
  return all.some((c) => c && !/^\s*__cf_bm=/i.test(c) && BLOCKING_COOKIE.test(c));
}

function withHtmlCacheHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("cache-control", HTML_CACHE_CONTROL);
  headers.delete("pragma");
  headers.delete("expires");
  // Never store a per-client cookie in a shared document.
  headers.delete("set-cookie");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

type EdgeCache = {
  match: (request: Request) => Promise<Response | undefined>;
  put: (request: Request, response: Response) => Promise<void>;
};

function getEdgeCache(): EdgeCache | undefined {
  const c = (globalThis as { caches?: { default?: EdgeCache } }).caches;
  return c?.default;
}

function waitUntil(ctx: unknown, promise: Promise<unknown>): void {
  const fn = (ctx as { waitUntil?: (p: Promise<unknown>) => void } | undefined)?.waitUntil;
  if (typeof fn === "function") fn.call(ctx, promise);
  else void promise.catch(() => {});
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const cacheable = isCacheableDocumentRequest(request);
      const cache = cacheable ? getEdgeCache() : undefined;
      // Cache key: URL only (no cookies/headers), so all visitors share it.
      const cacheKey = new Request(new URL(request.url).toString(), { method: "GET" });

      if (cache) {
        const hit = await cache.match(cacheKey);
        if (hit) {
          const headers = new Headers(hit.headers);
          headers.set("x-edge-cache", "HIT");
          headers.set("x-rr-wrapper", "1");
          return new Response(hit.body, { status: hit.status, headers });
        }
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);

      if (cacheable && isCacheableDocumentResponse(normalized) && !hasBlockingSetCookie(normalized)) {
        const cached = withHtmlCacheHeaders(normalized);
        if (cache) {
          waitUntil(ctx, cache.put(cacheKey, cached.clone()));
        }
        const headers = new Headers(cached.headers);
        headers.set("x-edge-cache", "MISS");
        headers.set("x-rr-wrapper", "1");
        return new Response(cached.body, { status: cached.status, headers });
      }

      const out = new Headers(normalized.headers);
      out.set("x-rr-wrapper", "1");
      out.set("x-edge-cache", "BYPASS");
      return new Response(normalized.body, {
        status: normalized.status,
        statusText: normalized.statusText,
        headers: out,
      });
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8", "x-rr-wrapper": "1" },
      });
    }
  },
};
