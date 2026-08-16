// Build TanStack Start head() output ({meta, links, scripts}) from a bundled
// SEO record (src/generated/seo/*.json). Emits <title>, meta[description],
// canonical, robots, og:*, twitter:*, og:image + width/height, and JSON-LD
// schema. Title/description are derived from og_title / og_description so
// every route ships its own per-page copy at SSR time.

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
  // schema is stored as a pre-serialized JSON string for wire-safety.
  schema?: string | null;
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

  // title + description (SSR per-route; overrides root defaults by
  // TanStack's meta merge on name/property).
  const title = rec.og?.og_title;
  const description = rec.og?.og_description;
  if (title) meta.push({ title });
  if (description) meta.push({ name: "description", content: description });

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
  // Fall back to the page's own og:image so Twitter/X cards use the local
  // per-page image instead of the root default (which was a stale
  // Lovable-preview URL). Every page ships a local og:image.
  const twitterImage = rec.twitter?.twitter_image || rec.og_image?.url;
  if (twitterImage) {
    meta.push({ name: "twitter:image", content: twitterImage });
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
      children: rec.schema,
    });
  }

  return { meta, links, scripts };
}

export function seoFileKey(path: string): string {
  const key = (path || "").replace(/^\/+|\/+$/g, "");
  return key ? encodeURIComponent(key) : "__home__";
}

export function augmentVideoSeo(
  rec: SeoRecord | null,
  record: { title?: string; meta_description?: string; video_settings?: string },
): SeoRecord | null {
  if (!rec?.schema || !record.video_settings) return rec;
  try {
    const settings = JSON.parse(record.video_settings) as { youtube_url?: string };
    const youtubeUrl = settings.youtube_url ?? "";
    const id = youtubeUrl.match(/(?:shorts\/|youtu\.be\/|[?&]v=)([A-Za-z0-9_-]{6,})/)?.[1];
    if (!id) return rec;
    const schema = JSON.parse(rec.schema) as { "@graph"?: unknown[] };
    const graph = Array.isArray(schema["@graph"]) ? schema["@graph"] : [];
    if (graph.some((item) => (item as { "@type"?: unknown })?.["@type"] === "VideoObject")) {
      return rec;
    }
    const page = graph.find((item) => (item as { "@type"?: unknown })?.["@type"] === "WebPage") as
      | { "@id"?: string; datePublished?: string; dateModified?: string }
      | undefined;
    graph.unshift({
      "@type": "VideoObject",
      "@id": `${rec.canonical ?? page?.["@id"] ?? ""}#video`,
      name: record.title || rec.og?.og_title,
      description: record.meta_description || rec.og?.og_description,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
      uploadDate: page?.datePublished,
      dateModified: page?.dateModified,
      embedUrl: `https://www.youtube.com/embed/${id}`,
      contentUrl: `https://www.youtube.com/watch?v=${id}`,
      inLanguage: "he-IL",
      isFamilyFriendly: true,
      publisher: { "@id": "https://www.rrshamaut.co.il/#organization" },
      mainEntityOfPage: { "@id": rec.canonical ?? page?.["@id"] },
    });
    return { ...rec, schema: JSON.stringify(schema) };
  } catch {
    return rec;
  }
}

export function augmentShortSeo(
  rec: SeoRecord | null,
  record: { title?: string; meta_description?: string; content_html?: string },
): SeoRecord | null {
  if (!rec?.schema) return rec;
  try {
    const schema = JSON.parse(rec.schema) as { "@graph"?: unknown[] };
    const graph = Array.isArray(schema["@graph"]) ? schema["@graph"] : [];
    if (graph.some((item) => (item as { "@type"?: unknown })?.["@type"] === "Article")) {
      return rec;
    }
    const page = graph.find((item) => (item as { "@type"?: unknown })?.["@type"] === "WebPage") as
      | { "@id"?: string; datePublished?: string; dateModified?: string }
      | undefined;
    const text = `${record.content_html ?? ""} ${record.meta_description ?? ""}`
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z#0-9]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    graph.unshift({
      "@type": "Article",
      "@id": `${rec.canonical ?? page?.["@id"] ?? ""}#article`,
      headline: record.title || rec.og?.og_title,
      description: record.meta_description || rec.og?.og_description,
      datePublished: page?.datePublished,
      dateModified: page?.dateModified,
      inLanguage: "he-IL",
      wordCount: text ? text.split(/\s+/).length : undefined,
      author: { "@id": "https://www.rrshamaut.co.il/#organization" },
      publisher: { "@id": "https://www.rrshamaut.co.il/#organization" },
      mainEntityOfPage: { "@id": rec.canonical ?? page?.["@id"] },
    });
    return { ...rec, schema: JSON.stringify(schema) };
  } catch {
    return rec;
  }
}

export function correctArticleWordCount(
  rec: SeoRecord | null,
  record: { content_html?: string },
): SeoRecord | null {
  if (!rec?.schema || !record.content_html) return rec;
  try {
    const schema = JSON.parse(rec.schema) as { "@graph"?: unknown[] };
    const graph = Array.isArray(schema["@graph"]) ? schema["@graph"] : [];
    const article = graph.find((item) => {
      const type = (item as { "@type"?: unknown })?.["@type"];
      return type === "Article" || type === "BlogPosting" ||
        (Array.isArray(type) && type.some((value) => value === "Article" || value === "BlogPosting"));
    }) as { wordCount?: number } | undefined;
    if (!article) return rec;
    const text = record.content_html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z#0-9]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    const wordCount = text ? text.split(/\s+/).length : 0;
    if (wordCount > 0) article.wordCount = wordCount;
    return { ...rec, schema: JSON.stringify(schema) };
  } catch {
    return rec;
  }
}
