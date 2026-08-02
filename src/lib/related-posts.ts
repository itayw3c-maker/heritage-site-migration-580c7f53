// Pure helpers shared by the client template and the server loader so related
// posts can be rendered in the SSR output (no post-hydration DOM swap).

export interface IndexPostLite {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  thumbnail?: string;
  categories?: number[];
}

export interface RelatedHtml {
  w1: string;
  w2: string;
}

export function escAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function pickRelated(
  posts: IndexPostLite[],
  currentSlug: string,
  limit: number,
): IndexPostLite[] {
  const current = posts.find((p) => p.slug === currentSlug);
  const cats = new Set(current?.categories ?? []);
  const filtered = posts.filter(
    (p) => p.slug !== currentSlug && (p.categories ?? []).some((c) => cats.has(c)),
  );
  return filtered.slice(0, limit);
}

export function relatedArticleFull(p: IndexPostLite): string {
  const href = `/${p.slug}/`;
  const catCls = (p.categories ?? []).map((c) => `category-${c}`).join(" ");
  const thumb = p.thumbnail
    ? `<a class="elementor-post__thumbnail__link" href="${escAttr(href)}" tabindex="-1"><div class="elementor-post__thumbnail"><img src="${escAttr(p.thumbnail)}" alt="${escAttr(p.title)}" loading="lazy" /></div></a>`
    : "";
  return `<article class="elementor-post elementor-grid-item post type-post status-publish format-standard hentry ${catCls}" role="listitem">
${thumb}
<div class="elementor-post__text">
<div class="elementor-post__title">
<a href="${escAttr(href)}">${p.title}</a>
</div>
<div class="elementor-post__excerpt">
<p>${p.excerpt ?? ""}</p>
</div>
<div class="elementor-post__read-more-wrapper">
<a aria-label="קרא עוד אודות ${escAttr(p.title)}" class="elementor-post__read-more" href="${escAttr(href)}" tabindex="-1">קראו עוד »</a>
</div>
</div>
</article>`;
}

export function relatedArticleTitleOnly(p: IndexPostLite): string {
  const href = `/${p.slug}/`;
  const catCls = (p.categories ?? []).map((c) => `category-${c}`).join(" ");
  return `<article class="elementor-post elementor-grid-item post type-post status-publish format-standard hentry ${catCls}" role="listitem">
<div class="elementor-post__text">
<div class="elementor-post__title">
<a href="${escAttr(href)}">${p.title}</a>
</div>
</div>
</article>`;
}

export function buildRelated(posts: IndexPostLite[], slug: string): RelatedHtml {
  return {
    w1: pickRelated(posts, slug, 4).map(relatedArticleFull).join("\n"),
    w2: pickRelated(posts, slug, 8).map(relatedArticleTitleOnly).join("\n"),
  };
}
