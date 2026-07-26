import { createServerFn } from "@tanstack/react-start";
import { seoFileKey, type SeoRecord } from "./seo-head";

// Server function that reads a stored SEO record from public/seo/<key>.json.
// Called from route loaders so head() can emit tags in SSR output.
export const getSeoRecord = createServerFn({ method: "GET" })
  .inputValidator((d: { path: string }) => ({ path: String(d?.path ?? "") }))
  .handler(async ({ data }): Promise<SeoRecord | null> => {
    try {
      // Read the file straight from disk (avoids Vite URL-decoding the
      // request path and losing the literal %XX filename on disk).
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const filename = `${seoFileKey(data.path)}.json`;
      const filePath = path.resolve(process.cwd(), "public/seo", filename);
      const contents = await fs.readFile(filePath, "utf-8");
      const raw = JSON.parse(contents) as {
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