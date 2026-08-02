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

const HTML_CACHE_CONTROL = "public, s-maxage=600, stale-while-revalidate=86400";

const AUTH_COOKIE_PATTERNS = [/sb-[^=]*auth-token/i, /session/i];

function getEdgeCache(): { match: (r: Request) => Promise<Response | undefined>; put: (r: Request, res: Response) => Promise<void> } | null {
  try {
    const c = (globalThis as { caches?: { default?: unknown } }).caches;
    const def = c && (c as { default?: unknown }).default;
    if (!def || typeof (def as { match?: unknown }).match !== "function") return null;
    return def as never;
  } catch {
    return null;
  }
}

function waitUntil(ctx: unknown, promise: Promise<unknown>) {
  const p = promise.catch((e) => console.error("edge-cache put failed", e));
  const w = (ctx as { waitUntil?: (p: Promise<unknown>) => void } | null)?.waitUntil;
  if (typeof w === "function") {
    try {
      w.call(ctx, p);
      return;
    } catch {
      /* fall through */
    }
  }
  void p;
}

function isCacheableDocumentRequest(request: Request): boolean {
  try {
    if (request.method !== "GET") return false;
    if (!(request.headers.get("accept") ?? "").includes("text/html")) return false;
    if (request.headers.get("authorization")) return false;

    const cookie = request.headers.get("cookie") ?? "";
    if (AUTH_COOKIE_PATTERNS.some((re) => re.test(cookie))) return false;

    const { pathname, search } = new URL(request.url);
    if (search) return false;
    if (pathname.startsWith("/admin") || pathname.startsWith("/api") || pathname.startsWith("/lovable")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function isCacheableDocumentResponse(response: Response): boolean {
  if (response.status !== 200) return false;
  if (!response.body) return false;
  return (response.headers.get("content-type") ?? "").includes("text/html");
}

// Only real auth/session cookies block caching; Cloudflare's __cf_bm is re-issued per client.
function hasBlockingSetCookie(response: Response): boolean {
  const values =
    typeof (response.headers as { getSetCookie?: () => string[] }).getSetCookie === "function"
      ? (response.headers as { getSetCookie: () => string[] }).getSetCookie()
      : [response.headers.get("set-cookie") ?? ""];
  return values.some((v) => v && AUTH_COOKIE_PATTERNS.some((re) => re.test(v)));
}

function withHtmlCacheHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("cache-control", HTML_CACHE_CONTROL);
  headers.delete("set-cookie");
  headers.delete("pragma");
  headers.delete("expires");
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const cacheable = isCacheableDocumentRequest(request);
    let cacheKey: Request | null = null;
    if (cacheable) {
      try {
        cacheKey = new Request(new URL(request.url).toString(), { method: "GET" });
      } catch {
        cacheKey = null;
      }
    }

    // 1) READ — best effort, never throws outward.
    if (cacheable && cacheKey) {
      try {
        const cache = getEdgeCache();
        if (cache) {
          const hit = await cache.match(cacheKey);
          if (hit) {
            const headers = new Headers(hit.headers);
            headers.set("x-edge-cache", "HIT");
            return new Response(hit.body, { status: hit.status, headers });
          }
        }
      } catch (error) {
        console.error("edge-cache read skipped", error);
      }
    }

    // 2) SSR — the known-good path.
    let normalized: Response;
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      normalized = await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    // 3) WRITE — best effort; any failure returns the untouched SSR response.
    if (cacheable && cacheKey) {
      try {
        if (isCacheableDocumentResponse(normalized) && !hasBlockingSetCookie(normalized)) {
          const toCache = withHtmlCacheHeaders(normalized.clone());
          const cache = getEdgeCache();
          if (cache) waitUntil(ctx, cache.put(cacheKey, toCache));
          const headers = new Headers(normalized.headers);
          headers.set("cache-control", HTML_CACHE_CONTROL);
          headers.delete("set-cookie");
          headers.delete("pragma");
          headers.delete("expires");
          headers.set("x-edge-cache", "MISS");
          return new Response(normalized.body, { status: normalized.status, headers });
        }
      } catch (error) {
        console.error("edge-cache write skipped", error);
        return normalized;
      }
    }

    return normalized;
  },
};
