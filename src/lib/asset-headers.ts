// Migrated images and fonts come back with no Cache-Control at all, and .woff2
// with Content-Type application/octet-stream, so they are refetched on every
// visit. public/_headers does not fix it because this site deploys as a Worker
// with an assets binding. wrangler.jsonc selectively enables
// assets.run_worker_first for these paths, allowing this response wrapper to
// apply the headers without routing hashed application assets through SSR.
//
// /assets/ is listed too, harmlessly: an existing Cache-Control is never
// overwritten, so the host's own header on its hashed build output still wins.
const IMMUTABLE_ASSET_PATH = /^\/(?:wp-content\/(?:uploads|plugins)|wp-includes|fonts|assets)\//i;

// The host serves .woff2 as application/octet-stream, and its nosniff header
// stops the browser from correcting the type itself, so it is corrected here.
const ASSET_CONTENT_TYPES: ReadonlyArray<[RegExp, string]> = [
  [/\.woff2$/i, "font/woff2"],
  [/\.woff$/i, "font/woff"],
  [/\.ttf$/i, "font/ttf"],
  [/\.otf$/i, "font/otf"],
  [/\.webp$/i, "image/webp"],
  [/\.svg$/i, "image/svg+xml"],
  [/\.avif$/i, "image/avif"],
];

export function withAssetHeaders(pathname: string, response: Response): Response {
  if (!response.ok || !IMMUTABLE_ASSET_PATH.test(pathname)) return response;

  const headers = new Headers(response.headers);
  if (!headers.has("cache-control")) {
    // These paths are versioned by filename: a new upload is a new URL.
    headers.set("cache-control", "public, max-age=31536000, immutable");
  }
  const currentType = headers.get("content-type") ?? "";
  if (!currentType || currentType.startsWith("application/octet-stream")) {
    const corrected = ASSET_CONTENT_TYPES.find(([pattern]) => pattern.test(pathname));
    if (corrected) headers.set("content-type", corrected[1]);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// A path whose last segment has a file extension, e.g. /fonts/x.woff2. Requests
// for a file that exists never reach the worker; ones for a file that does not
// reach it and get trailing-slash normalized. Those must stay temporary: a
// permanent redirect is cached by the browser indefinitely, so adding the file
// later would not fix the URL for anyone who had already requested it.
const FILE_LIKE_PATH = /\/[^/]+\.[a-z0-9]{2,5}$/i;

// TanStack's trailing-slash normalization answers with a temporary 307. For
// real pages the trailing-slash form is the canonical one and is not going to
// change, so the redirect is made permanent - a 308 keeps the method and body
// semantics 307 has, unlike a 301.
export function makeSlashRedirectPermanent(request: Request, response: Response): Response {
  if (response.status !== 307) return response;
  const location = response.headers.get("location");
  if (!location) return response;

  const from = new URL(request.url);
  const to = new URL(location, from);
  if (to.origin !== from.origin) return response;
  if (to.pathname !== `${from.pathname.replace(/\/+$/, "")}/`) return response;
  if (FILE_LIKE_PATH.test(from.pathname)) return response;

  return new Response(response.body, {
    status: 308,
    statusText: "Permanent Redirect",
    headers: response.headers,
  });
}
