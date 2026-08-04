// Pure helpers that map a DB post row (public.posts) onto the same
// SingleTemplate "post" record used by the migrated static articles, so DB
// articles are served at root-level slugs with identical design/typography.
import type { SingleRecord } from "@/components/SingleTemplate";
import type { SeoRecord } from "@/lib/seo-head";

export const SITE = "https://www.rrshamaut.co.il";

export interface DbPostLike {
  id: string;
  slug: string;
  title: string;
  h1: string | null;
  content_html: string | null;
  excerpt: string | null;
  featured_image: string | null;
  meta_title: string | null;
  meta_description: string | null;
  cta: string | null;
  faq_json: Array<{ question: string; answer: string }> | null;
  schema_jsonld: string | null;
  category_id: number | null;
  publish_at: string | null;
  created_at: string;
  updated_at: string;
}

export const CATEGORIES: Record<number, { name: string; slug: string }> = {
  1: { name: "מידע מקצועי", slug: "מידע-מקצועי" },
  25: { name: "ביטוח נזקי מים", slug: "water-damage-insurance" },
  26: { name: "נזקי שריפה", slug: "fire-damage" },
  27: { name: "הערכת נזקי רכוש ותכולה", slug: "property-damage-assessment" },
  28: { name: "ביטוח נזקי טבע", slug: "natural-disaster-insurance" },
  29: { name: "ליקויי בנייה", slug: "construction-defects" },
};

/** Stable pseudo post-id for body classes (postid-N) — cosmetic only. */
export function pseudoId(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 100000;
  return 900000 + h;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function heDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("he-IL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function breadcrumb(title: string): string {
  return `\n<p id="breadcrumbs"><span><span><a href="/">דף הבית</a></span> » <span aria-current="page" class="breadcrumb_last">${esc(title)}</span></span></p> `;
}

function faqHtml(items: Array<{ question: string; answer: string }>): string {
  if (!items.length) return "";
  const body = items
    .map(
      (i) =>
        `<details class="rr-faq-db__item"><summary>${esc(String(i.question ?? ""))}</summary><div>${String(i.answer ?? "")}</div></details>`,
    )
    .join("\n");
  return `\n<h2>שאלות ותשובות</h2>\n<div class="rr-faq-db">\n${body}\n</div>`;
}

function ctaHtml(cta: string): string {
  return `\n<div class="rr-cta-db"><p>${cta}</p></div>`;
}

export function dbPostToRecord(post: DbPostLike): SingleRecord {
  const heading = post.h1 || post.title;
  const content =
    (post.content_html ?? "") +
    faqHtml(post.faq_json ?? []) +
    (post.cta ? ctaHtml(post.cta) : "");
  return {
    type: "post",
    id: pseudoId(post.slug),
    title: heading,
    breadcrumb_html: breadcrumb(heading),
    content_html: content,
    updated_date: heDate(post.updated_at || post.publish_at || post.created_at),
    meta_title: post.meta_title || heading,
    meta_description: post.meta_description || post.excerpt || "",
  };
}

export function dbPostToSeo(post: DbPostLike): SeoRecord {
  const canonical = `${SITE}/${encodeURIComponent(post.slug)}/`;
  const title = post.meta_title || post.h1 || post.title;
  const description = post.meta_description || post.excerpt || "";
  const image = post.featured_image
    ? post.featured_image.startsWith("http")
      ? post.featured_image
      : `${SITE}${post.featured_image}`
    : null;
  return {
    canonical,
    robots: { index: "index", follow: "follow" },
    og: {
      og_locale: "he_IL",
      og_type: "article",
      og_title: title,
      og_description: description,
      og_url: canonical,
      og_site_name: "רפאל שמאות רכוש",
    },
    og_image: image ? { url: image } : null,
    twitter: { twitter_card: "summary_large_image", ...(image ? { twitter_image: image } : {}) },
    schema: post.schema_jsonld ?? null,
  };
}

/** Index-shaped entry so DB posts merge into the existing archive listings. */
export function dbPostToIndexEntry(post: DbPostLike) {
  return {
    slug: post.slug,
    title: post.h1 || post.title,
    date: post.publish_at || post.created_at,
    modified: post.updated_at,
    excerpt: post.excerpt ?? "",
    thumbnail: post.featured_image ?? "",
    categories: [post.category_id ?? 1],
  };
}

const KEYWORDS: Array<[number, RegExp]> = [
  [25, /water|leak|moisture|flood(?:ing)? damage|נזקי מים|נזילה|רטיבות|הצפה|אינסטלציה/i],
  [26, /\bfire\b|smoke|שריפה|אש\b|פיח|דליקה/i],
  [27, /property valuation|contents|הערכת שווי|תכולה|הערכת נזקי רכוש/i],
  [28, /storm|flood|hurricane|טבע|סערה|שיטפון|שטפון|רעידת אדמה/i],
  [29, /construction defect|ליקויי בנייה|ליקויי בניה|בדק בית/i],
];

export function detectCategory(text: string): number {
  for (const [id, re] of KEYWORDS) if (re.test(text)) return id;
  return 1;
}

export function resolveCategory(input: unknown, text: string): number {
  if (typeof input === "number" && CATEGORIES[input]) return input;
  if (typeof input === "string" && input.trim()) {
    const raw = input.trim();
    const num = Number(raw);
    if (Number.isFinite(num) && CATEGORIES[num]) return num;
    const hit = Object.entries(CATEGORIES).find(
      ([, v]) => v.slug === raw || v.name === raw,
    );
    if (hit) return Number(hit[0]);
  }
  return detectCategory(text);
}
