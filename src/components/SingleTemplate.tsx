import { useEffect, useMemo } from "react";
import postTpl from "@/generated/templates/post.html?raw";
import shortsTpl from "@/generated/templates/shorts.html?raw";
import movieTpl from "@/generated/templates/movie.html?raw";
import successTpl from "@/generated/templates/success.html?raw";
import serviceTpl from "@/generated/templates/service.html?raw";
import { enhanceElementor } from "@/lib/elementor-enhance";

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

function fill(tpl: string, rec: SingleRecord): string {
  const videoSettings = (rec.video_settings ?? "{}").replace(/"/g, "&quot;");
  return tpl
    .split("__HOLE_TITLE__").join(rec.title ?? "")
    .split("__HOLE_CONTENT__").join(rec.content_html ?? "")
    .split("__HOLE_BREADCRUMB__").join(rec.breadcrumb_html ?? "")
    .split("__HOLE_DATE__").join(rec.updated_date ?? "")
    .split("__HOLE_VIDEO_SETTINGS__").join(videoSettings);
}

export function SingleTemplate({ record }: { record: SingleRecord }) {
  const html = useMemo(() => {
    if (record.type === "static") return record.main_html ?? "";
    const tpl = TEMPLATES[record.type];
    return tpl ? fill(tpl, record) : "";
  }, [record]);

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

    return () => {
      if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    };
  }, [record]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}