import { getRequestUrl } from "@tanstack/react-start/server";
import { buildRelated, type IndexPostLite, type RelatedHtml } from "./related-posts";

function assetUrl(pathname: string): URL {
  const origin = getRequestUrl().origin;
  return new URL(pathname, origin);
}

async function fetchJson<T>(pathname: string): Promise<T | null> {
  try {
    const res = await fetch(assetUrl(pathname));
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("json")) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function contentPathname(slug: string): string {
  const encoded = slug
    .split("/")
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `/content/${encoded}.json`;
}

export async function loadContentRecord<T>(slug: string): Promise<T | null> {
  return fetchJson<T>(contentPathname(slug));
}

export async function loadRelated(
  slug: string,
  cats?: number[],
): Promise<RelatedHtml> {
  const idx = await fetchJson<{ posts?: IndexPostLite[] }>("/content/_indexes.json");
  if (!idx?.posts) return { w1: "", w2: "" };
  return buildRelated(idx.posts, slug, cats);
}
