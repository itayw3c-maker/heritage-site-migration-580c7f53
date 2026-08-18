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

// Search Console contains tens of thousands of legacy spam URLs shaped like
// /abcde/x123456.html. They were never real site content. A 410 tells crawlers
// to retire them faster than a generic 404 and avoids spending SSR resources.
function isKnownSpamPath(pathname: string): boolean {
  return (
    /^\/[a-z]{5}\/[a-z]\d+\.html\/?$/i.test(pathname) ||
    /^\/products\/\d+\/?$/i.test(pathname)
  );
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      if (isKnownSpamPath(new URL(request.url).pathname)) {
        return new Response("Gone", {
          status: 410,
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "x-robots-tag": "noindex, nofollow",
            "cache-control": "public, max-age=86400",
          },
        });
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
