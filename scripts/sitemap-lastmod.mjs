// Maps index entries to the content paths used by the sitemap loop.
// shorts/success entries carry a bare slug while their files live in
// public/content/shorts|success/, so the key needs the same prefix.
// Posts stay at the root. Unknown dates are omitted, never fabricated.
export const CONTENT_PREFIXES = { posts: "", shorts: "shorts/", success: "success/" };

export function buildModMap(idx) {
  const modMap = new Map();
  for (const [key, prefix] of Object.entries(CONTENT_PREFIXES)) {
    for (const item of idx?.[key] ?? []) {
      if (!item?.slug) continue;
      const path = prefix && !item.slug.startsWith(prefix) ? `${prefix}${item.slug}` : item.slug;
      const date = item.modified || item.date;
      if (date) modMap.set(path, date);
    }
  }
  return modMap;
}
