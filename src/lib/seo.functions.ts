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
      return (await r.json()) as SeoRecord;
    } catch {
      return null;
    }
  });