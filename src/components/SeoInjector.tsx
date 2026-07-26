import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

interface SeoRecord {
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

const cache = new Map<string, SeoRecord | null>();
const MANAGED_ATTR = "data-seo-injected";

function normalizePath(p: string): string {
  if (!p) return "/";
  let s = p.split("?")[0].split("#")[0];
  if (!s.startsWith("/")) s = "/" + s;
  if (!s.endsWith("/")) s = s + "/";
  return s;
}

function slugFileName(path: string): string {
  const key = path.replace(/^\/+|\/+$/g, "");
  return (key ? encodeURIComponent(key) : "__home__") + ".json";
}

function clearInjected() {
  document.head.querySelectorAll(`[${MANAGED_ATTR}]`).forEach((el) => el.remove());
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  const el = document.createElement("meta");
  el.setAttribute(attr, key);
  el.setAttribute("content", content);
  el.setAttribute(MANAGED_ATTR, "1");
  document.head.appendChild(el);
}

function apply(rec: SeoRecord) {
  clearInjected();

  // canonical
  if (rec.canonical) {
    // remove existing canonical (unmanaged) to avoid duplicates
    document.head.querySelectorAll('link[rel="canonical"]').forEach((el) => el.remove());
    const link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    link.setAttribute("href", rec.canonical);
    link.setAttribute(MANAGED_ATTR, "1");
    document.head.appendChild(link);
  }

  // robots
  if (rec.robots) {
    const parts: string[] = [];
    const idx = rec.robots["index"];
    const fol = rec.robots["follow"];
    if (idx) parts.push(idx);
    if (fol) parts.push(fol);
    for (const [k, v] of Object.entries(rec.robots)) {
      if (k === "index" || k === "follow") continue;
      if (typeof v === "string" && v) parts.push(v);
    }
    const content = parts.join(", ");
    // replace existing robots meta
    document.head.querySelectorAll('meta[name="robots"]').forEach((el) => el.remove());
    upsertMeta("name", "robots", content);
  }

  // og:*
  if (rec.og) {
    for (const [k, v] of Object.entries(rec.og)) {
      if (!v) continue;
      const prop = k.replace(/_/g, ":");
      // remove existing property tag (e.g. Lovable-injected og:image on r2.dev)
      document.head
        .querySelectorAll(`meta[property="${prop}"]`)
        .forEach((el) => el.remove());
      upsertMeta("property", prop, String(v));
    }
  }

  // og:image — strip Lovable r2.dev auto-screenshot, use bundle value
  document.head.querySelectorAll('meta[property="og:image"]').forEach((el) => {
    const c = el.getAttribute("content") ?? "";
    if (/r2\.dev/i.test(c)) el.remove();
  });
  document.head.querySelectorAll('meta[name="twitter:image"]').forEach((el) => {
    const c = el.getAttribute("content") ?? "";
    if (/r2\.dev/i.test(c)) el.remove();
  });
  if (rec.og_image?.url) {
    upsertMeta("property", "og:image", rec.og_image.url);
    if (rec.og_image.width) upsertMeta("property", "og:image:width", String(rec.og_image.width));
    if (rec.og_image.height) upsertMeta("property", "og:image:height", String(rec.og_image.height));
  }

  // twitter
  if (rec.twitter) {
    if (rec.twitter.twitter_card) {
      document.head
        .querySelectorAll('meta[name="twitter:card"]')
        .forEach((el) => el.remove());
      upsertMeta("name", "twitter:card", rec.twitter.twitter_card);
    }
    if (rec.twitter.twitter_image) {
      upsertMeta("name", "twitter:image", rec.twitter.twitter_image);
    }
    if (rec.twitter.twitter_misc) {
      const labels = Object.keys(rec.twitter.twitter_misc);
      labels.forEach((label, i) => {
        upsertMeta("name", `twitter:label${i + 1}`, label);
        upsertMeta("name", `twitter:data${i + 1}`, rec.twitter!.twitter_misc![label]);
      });
    }
  }

  // JSON-LD
  if (rec.schema) {
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.setAttribute(MANAGED_ATTR, "1");
    s.textContent = JSON.stringify(rec.schema);
    document.head.appendChild(s);
  }
}

export function SeoInjector() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const path = normalizePath(pathname);
    if (path.startsWith("/admin/") || path === "/admin/") {
      clearInjected();
      return;
    }

    let cancelled = false;

    const use = (rec: SeoRecord | null) => {
      if (cancelled) return;
      if (rec) apply(rec);
      else clearInjected();
    };

    if (cache.has(path)) {
      use(cache.get(path) ?? null);
    } else {
      const file = slugFileName(path);
      fetch(`/seo/${file}`, { headers: { accept: "application/json" } })
        .then((r) => (r.ok ? r.json() : null))
        .then((rec: SeoRecord | null) => {
          cache.set(path, rec);
          use(rec);
        })
        .catch(() => {
          cache.set(path, null);
          use(null);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}