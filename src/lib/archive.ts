import { overrideSeoIdentity, type SeoRecord } from "./seo-head";

export type ArchiveKind = "category" | "shorts" | "success";
export interface IndexPost {
  slug: string;
  title: string;
  date: string;
  modified: string;
  excerpt: string;
  thumbnail: string;
  categories: number[];
  video_settings?: string;
}
export interface IndexBundle {
  categories: Record<string, { name: string; slug: string }>;
  posts: IndexPost[];
  shorts: IndexPost[];
  success: IndexPost[];
}
export interface ArchiveData {
  kind: ArchiveKind;
  categorySlug?: string;
  page: number;
  totalPages: number;
  posts: IndexPost[];
  related: IndexPost[];
  heading: string;
  title: string;
  description: string;
  canonical: string;
}
export function decodeArchiveSlug(value: string): string {
  try { return decodeURIComponent(value); } catch { return value; }
}
export function selectArchivePage(
  index: IndexBundle,
  input: { kind: ArchiveKind; page: number; categorySlug?: string },
  extraPosts: IndexPost[] = [],
): ArchiveData | null {
  const { kind, page } = input;
  if (!Number.isSafeInteger(page) || page < 1) return null;
  const categorySlug = decodeArchiveSlug(input.categorySlug ?? "");
  let posts: IndexPost[];
  let heading: string;
  let base: string;
  if (kind === "category") {
    const category = Object.entries(index.categories).find(([, value]) => decodeArchiveSlug(value.slug) === categorySlug);
    if (!category) return null;
    const [id, info] = category;
    // DB entries take precedence when an imported article is edited. The
    // general information archive also includes the specialist categories.
    posts = [...new Map([...index.posts, ...extraPosts].map(post => [post.slug, post])).values()]
      .filter(post => id === "1" || post.categories?.includes(Number(id)))
      .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
    heading = id === "1" ? "מאמרים ומידע מקצועי בנושא שמאות רכוש" : `מאמרים בנושא ${info.name}`;
    base = `/category/${encodeURIComponent(categorySlug)}`;
  } else if (kind === "shorts") {
    posts = index.shorts;
    heading = "סרטונים קצרים והסברים מקצועיים";
    base = "/shorts";
  } else {
    posts = index.success;
    heading = "סיפורי הצלחה בתביעות ביטוח ושמאות רכוש";
    base = "/success";
  }
  const size = { category: 9, shorts: 6, success: 30 }[kind];
  const totalPages = Math.max(1, Math.ceil(posts.length / size));
  if (page > totalPages) return null;
  const selected = posts.slice((page - 1) * size, page * size);
  return {
    kind, categorySlug: kind === "category" ? categorySlug : undefined,
    page, totalPages, posts: selected,
    related: kind === "category" ? posts.filter(post => !selected.some(item => item.slug === post.slug)).slice(0, 4) : [],
    heading,
    title: `${heading}${page > 1 ? ` — עמוד ${page}` : ""} | רפאל שמאות רכוש`,
    description: `${heading} ממשרד רפאל שמאות רכוש. ${page > 1 ? `עמוד ${page}. ` : ""}מידע מקצועי על הערכת נזקים ותביעות ביטוח.`,
    canonical: `https://www.rrshamaut.co.il${base}${page > 1 ? `/page/${page}` : ""}/`,
  };
}
export function archiveSeo(record: SeoRecord | null, archive: ArchiveData): SeoRecord {
  const result = overrideSeoIdentity(record ?? { og: {} }, archive) ?? { og: {} };
  return {
    ...result,
    robots: { index: "index", follow: "follow" },
    schema: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": archive.canonical,
      url: archive.canonical,
      name: archive.title,
      description: archive.description,
      inLanguage: "he-IL",
      mainEntity: {
        "@type": "ItemList",
        itemListElement: archive.posts.map((post, index) => ({
          "@type": "ListItem", position: index + 1,
          name: post.title,
          url: `https://www.rrshamaut.co.il/${post.slug.split("/").map(encodeURIComponent).join("/")}/`,
        })),
      },
    }).replace(/</g, "\\u003c"),
  };
}
