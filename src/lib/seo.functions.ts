import { createServerFn } from "@tanstack/react-start";
import type { SeoRecord } from "./seo-head";

// Server function that loads a bundled SEO record from src/generated/seo/<key>.json.
// Called from route loaders so head() can emit tags in SSR output.
export const getSeoRecord = createServerFn({ method: "GET" })
  .inputValidator((d: { path: string }) => ({ path: String(d?.path ?? "") }))
  .handler(async ({ data }): Promise<SeoRecord | null> => {
    const { loadSeoRecord } = await import("./seo-data.server");
    return loadSeoRecord(data.path);
  });