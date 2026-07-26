import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { seoFileKey, type SeoRecord } from "./seo-head";

// Server function that reads a stored SEO record from public/seo/<key>.json.
// Called from route loaders so head() can emit tags in SSR output.
export const getSeoRecord = createServerFn({ method: "GET" })
  .inputValidator((d: { path: string }) => ({ path: String(d?.path ?? "") }))
  .handler(async ({ data }): Promise<SeoRecord | null> => {
    try {
      const req = getRequest();
      const origin = new URL(req.url).origin;
      const url = `${origin}/seo/${seoFileKey(data.path)}.json`;
      const r = await fetch(url);
      if (!r.ok) return null;
      const raw = (await r.json()) as {
        canonical?: string;
        robots?: Record<string, string>;
        og?: Record<string, string>;
        og_image?: { url?: string; width?: number; height?: number } | null;
        twitter?: SeoRecord["twitter"];
        schema?: unknown;
      };
      // Pre-stringify the JSON-LD graph so the value travels as a plain
      // string through the TanStack Start serializer.
      const rec: SeoRecord = {
        canonical: raw.canonical,
        robots: raw.robots,
        og: raw.og,
        og_image: raw.og_image,
        twitter: raw.twitter,
        schema: raw.schema ? JSON.stringify(raw.schema) : null,
      };
      return rec;
    } catch {
      return null;
    }
  });