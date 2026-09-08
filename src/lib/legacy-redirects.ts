// 301s for WordPress URLs that were removed and now answer 404. These are
// separate from src/lib/redirect-map.ts: that map is the keyword-consolidation
// plan, still gated behind REDIRECTS_ENABLED until the merged content ships.
// The entries here are retired URLs with no content left to merge, so they can
// redirect immediately.
//
// Keys and values are normalized paths - no leading or trailing slash, not
// encoded. resolveLegacyRedirect returns an encoded absolute path.

export const LEGACY_REDIRECTS: Readonly<Record<string, string>> = {
  // Removed article on the property appraiser's role. Sent to the live article
  // covering the same intent rather than to the homepage: a redirect to a page
  // that does not answer the original query reads as a soft 404 and drops the
  // link equity the URL still holds.
  "שמאי-רכוש-תפקידו-וחשיבותו": "שמאי-רכוש-לנזקים-והערכות-שווי-תפקיד-עב",
};

/**
 * Returns the redirect target for a normalized path, or null when there is
 * none. The result is encoded and trailing-slashed to match site canonicals.
 */
export function resolveLegacyRedirect(path: string): string | null {
  const target = LEGACY_REDIRECTS[path];
  if (!target) return null;
  return `/${encodeURI(target)}/`;
}
