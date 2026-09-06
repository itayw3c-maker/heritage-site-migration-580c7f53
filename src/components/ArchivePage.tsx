import { useEffect, useMemo } from "react";
import categoryWrap from "@/generated/archives/category.html?raw";
import shortsWrap from "@/generated/archives/shorts.html?raw";
import successWrap from "@/generated/archives/success.html?raw";
import { enhanceElementor } from "@/lib/elementor-enhance";
import { improveMigratedHtml } from "@/lib/migrated-html";

import type { ArchiveData, ArchiveKind, IndexPost } from "@/lib/archive";
export type { ArchiveKind, IndexPost } from "@/lib/archive";

const WRAPPERS: Record<ArchiveKind, string> = {
  category: categoryWrap,
  shorts: shortsWrap,
  success: successWrap,
};

const BODY_CLASSES: Record<ArchiveKind, (extra?: string) => string> = {
  category: () =>
    "rtl archive category category-1 wp-custom-logo wp-embed-responsive wp-theme-hello-elementor eio-default manage-default ally-default esm-default hello-elementor-default elementor-page-2990 elementor-default elementor-template-full-width elementor-kit-7",
  shorts: () =>
    "rtl archive post-type-archive post-type-archive-shorts wp-custom-logo wp-embed-responsive wp-theme-hello-elementor eio-default manage-default ally-default esm-default hello-elementor-default elementor-page-4417 elementor-default elementor-template-full-width elementor-kit-7",
  success: () =>
    "rtl archive post-type-archive post-type-archive-success wp-custom-logo wp-embed-responsive wp-theme-hello-elementor eio-default manage-default ally-default esm-default hello-elementor-default elementor-page-4112 elementor-default elementor-template-full-width elementor-kit-7",
};

function escAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function categoryCard(p: IndexPost): string {
  const href = `/${p.slug}/`;
  const catCls = (p.categories || []).map((c) => `category-${c}`).join(" ");
  const thumb = p.thumbnail
    ? `<a class="elementor-post__thumbnail__link" href="${escAttr(href)}" tabindex="-1"><div class="elementor-post__thumbnail"><img src="${escAttr(p.thumbnail)}" alt="${escAttr(p.title)}" loading="lazy" /></div></a>`
    : "";
  return `<article class="elementor-post elementor-grid-item post type-post status-publish format-standard hentry ${catCls}">
    <div class="elementor-post__card">
      ${thumb}
      <div class="elementor-post__text">
        <h3 class="elementor-post__title">
          <a href="${escAttr(href)}">${escText(p.title)}</a>
        </h3>
        <div class="elementor-post__excerpt">
          <p>${escText(p.excerpt)}</p>
        </div>
        <div class="elementor-post__read-more-wrapper">
          <a class="elementor-post__read-more" href="${escAttr(href)}" aria-label="קרא עוד אודות ${escAttr(p.title)}" tabindex="-1">קרא עוד »</a>
        </div>
      </div>
    </div>
  </article>`;
}

function categoryRelated(p: IndexPost): string {
  const href = `/${p.slug}/`;
  const thumb = p.thumbnail
    ? `<a class="elementor-post__thumbnail__link" href="${escAttr(href)}" tabindex="-1"><div class="elementor-post__thumbnail"><img src="${escAttr(p.thumbnail)}" alt="${escAttr(p.title)}" loading="lazy" /></div></a>`
    : "";
  return `<article class="elementor-post elementor-grid-item post type-post status-publish format-standard hentry">
${thumb}
<div class="elementor-post__text">
<div class="elementor-post__title"><a href="${escAttr(href)}">${escText(p.title)}</a></div>
<div class="elementor-post__read-more-wrapper"><a class="elementor-post__read-more" href="${escAttr(href)}" aria-label="קרא עוד אודות ${escAttr(p.title)}" tabindex="-1">קראו עוד »</a></div>
</div>
</article>`;
}

function shortsCard(p: IndexPost): string {
  const href = `/${p.slug}/`;
  const vs = p.video_settings ? ` data-settings="${escAttr(p.video_settings)}"` : "";
  const videoInner = p.video_settings
    ? `<div class="elementor-video"></div>`
    : `<a href="${escAttr(href)}"><div class="elementor-video"></div></a>`;
  return `<div data-elementor-type="loop-item" data-elementor-id="4419" class="elementor elementor-4419 e-loop-item post shorts type-shorts status-publish hentry">
    <div class="elementor-element e-flex e-con-boxed e-con e-parent" data-element_type="container">
      <div class="e-con-inner">
        <div class="elementor-element elementor-widget elementor-widget-video"${vs} data-element_type="widget" data-widget_type="video.default">
          <div class="elementor-widget-container">
            <div class="elementor-wrapper elementor-open-inline">
              ${videoInner}
            </div>
          </div>
        </div>
        <div class="elementor-element elementor-widget elementor-widget-theme-post-title elementor-page-title elementor-widget-heading" data-element_type="widget" data-widget_type="theme-post-title.default">
          <div class="elementor-widget-container">
            <div class="elementor-heading-title elementor-size-default"><a href="${escAttr(href)}">${escText(p.title)}</a></div>
          </div>
        </div>
        <div class="elementor-element elementor-align-center elementor-widget elementor-widget-button" data-element_type="widget" data-widget_type="button.default">
          <div class="elementor-widget-container">
            <div class="elementor-button-wrapper">
              <a class="elementor-button elementor-button-link elementor-size-sm" href="${escAttr(href)}">
                <span class="elementor-button-content-wrapper">
                  <span class="elementor-button-text">לחץ כאן</span>
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function successCard(p: IndexPost): string {
  const href = `/${p.slug}/`;
  const img = p.thumbnail
    ? `<img src="${escAttr(p.thumbnail)}" alt="${escAttr(p.title)}" loading="lazy" />`
    : "";
  return `<div data-elementor-type="loop-item" data-elementor-id="4114" class="elementor elementor-4114 e-loop-item post success type-success status-publish ${p.thumbnail ? "has-post-thumbnail" : ""} hentry">
    <div class="elementor-element e-flex e-con-boxed e-con e-parent" data-element_type="container">
      <div class="e-con-inner">
        <div class="elementor-element elementor-widget elementor-widget-theme-post-featured-image elementor-widget-image" data-element_type="widget" data-widget_type="theme-post-featured-image.default">
          <div class="elementor-widget-container">${img}</div>
        </div>
        <div class="elementor-element elementor-widget elementor-widget-theme-post-title elementor-page-title elementor-widget-heading" data-element_type="widget" data-widget_type="theme-post-title.default">
          <div class="elementor-widget-container">
            <div class="elementor-heading-title elementor-size-default">${escText(p.title)}</div>
          </div>
        </div>
        <div class="elementor-element elementor-align-center elementor-widget elementor-widget-button" data-element_type="widget" data-widget_type="button.default">
          <div class="elementor-widget-container">
            <div class="elementor-button-wrapper">
              <a class="elementor-button elementor-button-link elementor-size-sm" href="${escAttr(href)}">
                <span class="elementor-button-content-wrapper">
                  <span class="elementor-button-text">לפרטים ←</span>
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

const CARD_BUILDERS: Record<ArchiveKind, (p: IndexPost) => string> = {
  category: categoryCard,
  shorts: shortsCard,
  success: successCard,
};

function paginationHtml(kind: ArchiveKind, catSlug: string | undefined, page: number, totalPages: number): string {
  if (totalPages <= 1) return "";
  const base =
    kind === "category"
      ? `/category/${encodeURI(catSlug ?? "")}`
      : kind === "shorts"
        ? "/shorts"
        : "/success";
  const url = (n: number) => (n === 1 ? `${base}/` : `${base}/page/${n}/`);
  const parts: string[] = [];
  if (page > 1) {
    parts.push(`<a class="page-numbers prev" href="${url(page - 1)}">« הקודם</a>`);
  }
  for (let n = 1; n <= totalPages; n++) {
    if (n === page) {
      parts.push(`<span aria-current="page" class="page-numbers current">${n}</span>`);
    } else {
      parts.push(`<a class="page-numbers" href="${url(n)}">${n}</a>`);
    }
  }
  if (page < totalPages) {
    parts.push(`<a class="page-numbers next" href="${url(page + 1)}">הבא »</a>`);
  }
  return `<nav class="elementor-pagination" aria-label="Pagination" role="navigation">${parts.join("\n")}</nav>`;
}

export function ArchivePage({ archive }: { archive: ArchiveData }) {
  const { kind, page, categorySlug } = archive;
  const html = useMemo(() => {
    const slice = archive.posts;
    const build = CARD_BUILDERS[kind];
    const itemsHtml = slice.map(build).join("\n");
    const pagHtml = paginationHtml(kind, categorySlug, page, archive.totalPages);
    const relatedHtml = archive.related.map(categoryRelated).join("\n");
    return improveMigratedHtml(WRAPPERS[kind], archive.title)
      .replace(/(<h1\b[^>]*>)[\s\S]*?(<\/h1>)/i, (_match, open, close) => `${open}${escText(archive.heading)}${close}`)
      .split("__HOLE_ITEMS__").join(itemsHtml)
      .split("__HOLE_PAGINATION__").join(pagHtml)
      .split("__HOLE_RELATED_1__").join(relatedHtml);
  }, [archive, kind, page, categorySlug]);

  useEffect(() => {
    document.body.className = BODY_CLASSES[kind]();
    document.querySelectorAll(".e-con.e-parent").forEach((el) => el.classList.add("e-lazyloaded"));
    enhanceElementor(document);
  }, [kind, html, page]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

