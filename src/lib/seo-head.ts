// Build TanStack Start head() output ({meta, links, scripts}) from a stored
// SEO record (public/seo/*.json). Emits canonical, robots, og:*, twitter:*,
// og:image + width/height, and JSON-LD schema.
//
// Never emits title or meta[description] — those are owned by the route's
// existing head()/SingleTemplate/root defaults. If the record contains
// title/description we ignore them.

export interface SeoRecord {
  canonical?: string;
  robots?: Record<string, string>;
  og?: Record<string, string>;
  og_image?: { url?: string; width?: number; height?: number } | null;
  twitter?: {
    twitter_card?: string;
    twitter_image?: string;
    twitter_misc?: Record<string, string>;
  };
  schema?: unknown;
}

export interface HeadFragment {
  meta: Array<Record<string, string>>;
  links: Array<Record<string, string>>;
  scripts: Array<Record<string, string>>;
}

export function buildSeoHead(rec: SeoRecord | null | undefined): HeadFragment {
  const meta: HeadFragment["meta"] = [];
  const links: HeadFragment["links"] = [];
  const scripts: HeadFragment["scripts"] = [];
  if (!rec) return { meta, links, scripts };

  // robots
  if (rec.robots) {
    const parts: string[] = [];
    if (rec.robots["index"]) parts.push(rec.robots["index"]);
    if (rec.robots["follow"]) parts.push(rec.robots["follow"]);
    for (const [k, v] of Object.entries(rec.robots)) {
      if (k === "index" || k === "follow") continue;
      if (typeof v === "string" && v) parts.push(v);
    }
    if (parts.length) meta.push({ name: "robots", content: parts.join(", ") });
  }

  // og:*
  if (rec.og) {
    for (const [k, v] of Object.entries(rec.og)) {
      if (!v) continue;
      const prop = k.replace(/_/g, ":");
      // og:image handled separately below
      if (prop === "og:image") continue;
      meta.push({ property: prop, content: String(v) });
    }
  }

  // og:image
  if (rec.og_image?.url) {
    meta.push({ property: "og:image", content: rec.og_image.url });
    if (rec.og_image.width)
      meta.push({ property: "og:image:width", content: String(rec.og_image.width) });
    if (rec.og_image.height)
      meta.push({ property: "og:image:height", content: String(rec.og_image.height) });
  }

  // twitter
  if (rec.twitter?.twitter_card) {
    meta.push({ name: "twitter:card", content: rec.twitter.twitter_card });
  }
  if (rec.twitter?.twitter_image) {
    meta.push({ name: "twitter:image", content: rec.twitter.twitter_image });
  }
  if (rec.twitter?.twitter_misc) {
    const labels = Object.keys(rec.twitter.twitter_misc);
    labels.forEach((label, i) => {
      meta.push({ name: `twitter:label${i + 1}`, content: label });
      meta.push({ name: `twitter:data${i + 1}`, content: rec.twitter!.twitter_misc![label] });
    });
  }

  if (rec.canonical) {
    links.push({ rel: "canonical", href: rec.canonical });
  }

  if (rec.schema) {
    scripts.push({
      type: "application/ld+json",
      children: JSON.stringify(rec.schema),
    });
  }

  return { meta, links, scripts };
}

export function seoFileKey(path: string): string {
  const key = (path || "").replace(/^\/+|\/+$/g, "");
  return key ? encodeURIComponent(key) : "__home__";
}