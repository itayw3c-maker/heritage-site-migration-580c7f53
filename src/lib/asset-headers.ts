// The custom rules in public/_headers do not reach the live response. Measured
// on 08.09.2026, months after those rules shipped: the host's own hashed build
// output under /assets/ comes back `public, max-age=31536000, immutable`, but
// /wp-content/uploads/ and /fonts/ - which _headers covers with identical
// rules - come back with no Cache-Control at all. So the caching on /assets/
// is the host's default for its build output, not _headers being honoured, and
// every migrated image and font was refetched on each visit. Caching is
// applied here instead, where it demonstrably reaches the response.
//
// /assets/ is listed too, harmlessly: an existing Cache-Control is never
// overwritten, so the host's own header still wins there.
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

// TanStack's trailing-slash normalization answers with a temporary 307. The
// canonical form of every URL on this site is the trailing-slash one and that
// is not going to change, so the redirect is made permanent - a 308 keeps the
// method and body semantics 307 has, unlike a 301.
export function makeSlashRedirectPermanent(request: Request, response: Response): Response {
  if (response.status !== 307) return response;
  const location = response.headers.get("location");
  if (!location) return response;

  const from = new URL(request.url);
  const to = new URL(location, from);
  if (to.origin !== from.origin) return response;
  if (to.pathname !== `${from.pathname.replace(/\/+$/, "")}/`) return response;

  return new Response(response.body, {
    status: 308,
    statusText: "Permanent Redirect",
    headers: response.headers,
  });
}
