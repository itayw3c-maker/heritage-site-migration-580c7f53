import { useEffect, useMemo, useState } from "react";
import postTpl from "@/generated/templates/post.html?raw";
import shortsTpl from "@/generated/templates/shorts.html?raw";
import movieTpl from "@/generated/templates/movie.html?raw";
import successTpl from "@/generated/templates/success.html?raw";
import serviceTpl from "@/generated/templates/service.html?raw";
import { enhanceElementor } from "@/lib/elementor-enhance";
import {
  buildRelated,
  type IndexPostLite,
  type RelatedHtml,
} from "@/lib/related-posts";

export type SingleType = "post" | "shorts" | "movie" | "success" | "service" | "static";

export interface SingleRecord {
  type: SingleType;
  id: number;
  title: string;
  breadcrumb_html?: string;
  content_html?: string;
  updated_date?: string;
  meta_title?: string;
  meta_description?: string;
  video_settings?: string;
  main_html?: string;
  body_class?: string;
  styles_css?: string;
  featured_image_url?: string;
}

interface IndexBundleLite {
  posts: IndexPostLite[];
}

let indexCache: IndexBundleLite | null = null;
let indexPromise: Promise<IndexBundleLite | null> | null = null;
function loadIndex(): Promise<IndexBundleLite | null> {
  if (indexCache) return Promise.resolve(indexCache);
  if (!indexPromise) {
    indexPromise = fetch("/content/_indexes.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: IndexBundleLite | null) => {
        indexCache = d;
        return d;
      })
      .catch(() => null);
  }
  return indexPromise;
}

const TEMPLATES: Partial<Record<SingleType, string>> = {
  post: postTpl,
  shorts: shortsTpl,
  movie: movieTpl,
  success: successTpl,
  service: serviceTpl,
};

function bodyClassFor(type: SingleType, id: number): string {
  const base =
    "wp-custom-logo wp-embed-responsive wp-theme-hello-elementor eio-default manage-default ally-default esm-default hello-elementor-default elementor-default elementor-kit-7";
  switch (type) {
    case "post":
      return `rtl wp-singular post-template-default single single-post postid-${id} single-format-standard ${base} elementor-page-1150`;
    case "shorts":
      return `rtl wp-singular shorts-template-default single single-shorts postid-${id} ${base} elementor-page-4437`;
    case "movie":
      return `rtl wp-singular movie-template-default single single-movie postid-${id} ${base} elementor-page-3614`;
    case "success":
      return `rtl wp-singular success-template-default single single-success postid-${id} ${base} elementor-page-3342`;
    case "service":
      return `rtl wp-singular page-template-default page page-id-${id} ${base} elementor-page-4670`;
    case "static":
      return base;
  }
}

function fill(tpl: string, rec: SingleRecord, relatedHtml1: string): string {
  const videoSettings = (rec.video_settings ?? "{}").replace(/"/g, "&quot;");
  const featuredImage =
    rec.type === "success" ? buildFeaturedImage(rec.featured_image_url, rec.title ?? "") : "";
  return tpl
    .split("__HOLE_TITLE__").join(rec.title ?? "")
    .split("__HOLE_CONTENT__").join(rec.content_html ?? "")
    .split("__HOLE_BREADCRUMB__").join(rec.breadcrumb_html ?? "")
    .split("__HOLE_DATE__").join(rec.updated_date ?? "")
    .split("__HOLE_VIDEO_SETTINGS__").join(videoSettings)
    .split("__HOLE_RELATED_1__").join(relatedHtml1)
    .split("__HOLE_FEATURED_IMAGE__").join(featuredImage);
}

function buildFeaturedImage(url: string | undefined, alt: string): string {
  if (!url) return "";
  return `<img alt="${escAttr(alt)}" class="attachment-large size-large" src="${escAttr(url)}" loading="lazy" />`;
}

export function SingleTemplate({ record, slug }: { record: SingleRecord; slug?: string }) {
  const [related, setRelated] = useState<{ w1: string; w2: string }>({ w1: "", w2: "" });

  useEffect(() => {
    let cancelled = false;
    if (record.type !== "post" || !slug) {
      setRelated({ w1: "", w2: "" });
      return;
    }
    loadIndex().then((idx) => {
      if (cancelled || !idx) return;
      const r1 = pickRelated(idx.posts, slug, 4).map(relatedArticleFull).join("\n");
      const r2 = pickRelated(idx.posts, slug, 8).map(relatedArticleTitleOnly).join("\n");
      setRelated({ w1: r1, w2: r2 });
    });
    return () => {
      cancelled = true;
    };
  }, [record, slug]);

  const html = useMemo(() => {
    if (record.type === "static") return record.main_html ?? "";
    const tpl = TEMPLATES[record.type];
    return tpl ? fill(tpl, record, related.w1) : "";
  }, [record, related.w1]);

  useEffect(() => {
    if (record.type === "static") {
      document.title = record.title ?? "";
      if (record.body_class) document.body.className = record.body_class;
      else document.body.className = bodyClassFor(record.type, record.id);
    } else {
      if (record.meta_title) document.title = record.meta_title;
      document.body.className = bodyClassFor(record.type, record.id);
    }

    if (record.meta_description) {
      let metaEl = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!metaEl) {
        metaEl = document.createElement("meta");
        metaEl.name = "description";
        document.head.appendChild(metaEl);
      }
      metaEl.content = record.meta_description;
    }

    let styleEl: HTMLStyleElement | null = null;
    if (record.type === "static" && record.styles_css) {
      const styleId = `page-css-${record.id}`;
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.textContent = record.styles_css;
      document.head.appendChild(styleEl);
    }

    document.querySelectorAll(".e-con.e-parent").forEach((el) => {
      el.classList.add("e-lazyloaded");
    });
    enhanceElementor(document);

    // Swap footer widget 92ba2bb "מאמרים חשובים" with related posts for post pages.
    let footerContainer: Element | null = null;
    let footerOriginal: string | null = null;
    if (record.type === "post" && related.w2) {
      footerContainer = document.querySelector(
        '[data-id="92ba2bb"] .elementor-posts-container',
      );
      if (footerContainer) {
        footerOriginal = footerContainer.innerHTML;
        footerContainer.innerHTML = related.w2;
      }
    }

    return () => {
      if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
      if (footerContainer && footerOriginal !== null) {
        footerContainer.innerHTML = footerOriginal;
      }
    };
  }, [record, related]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}