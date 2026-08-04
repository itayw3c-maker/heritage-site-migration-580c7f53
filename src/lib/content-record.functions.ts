import { createServerFn } from "@tanstack/react-start";
import type { SingleRecord } from "@/components/SingleTemplate";
import type { RelatedHtml } from "./related-posts";
import type { SeoRecord } from "./seo-head";

interface ContentResult {
  record: SingleRecord | null;
  related: RelatedHtml;
  /** SEO fragment for DB-backed posts (static pages use the bundled records). */
  dbSeo: SeoRecord | null;
}

// Server-side read of public/content/<slug>.json so template-driven pages are
// part of the SSR HTML. When no static record exists, fall back to a published
// DB post with the same slug so API-published articles are served at root level
// through the very same SingleTemplate design.
// `static` records are intentionally skipped: they carry up to ~300KB of
// page-scoped CSS and would be serialized twice (rendered + loader payload).
export const getContentRecord = createServerFn({ method: "GET" })
  .inputValidator((d: { path: string }) => ({ path: String(d?.path ?? "") }))
  .handler(async ({ data }): Promise<ContentResult> => {
    const empty: ContentResult = { record: null, related: { w1: "", w2: "" }, dbSeo: null };
    if (!data.path) return empty;
    const { loadContentRecord, loadRelated } = await import("./content-record.server");
    const record = await loadContentRecord<SingleRecord>(data.path);
    if (record) {
      if (!record.type || record.type === "static") return empty;
      const related =
        record.type === "post" ? await loadRelated(data.path) : { w1: "", w2: "" };
      return { record, related, dbSeo: null };
    }

    // DB fallback (root-level slug, single segment only).
    if (data.path.includes("/")) return empty;
    try {
      const { getPublishedPost } = await import("./blog.server");
      const post = await getPublishedPost(data.path);
      if (!post) return empty;
      const { dbPostToRecord, dbPostToSeo, dbPostToIndexEntry } = await import("./db-post");
      const related = await loadRelated(post.slug, dbPostToIndexEntry(post).categories);
      return { record: dbPostToRecord(post), related, dbSeo: dbPostToSeo(post) };
    } catch {
      return empty;
    }
  });

// Index-shaped DB posts so they merge into the existing category archives.
export const getDbArchivePosts = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { listPublishedPosts } = await import("./blog.server");
    const { dbPostToIndexEntry } = await import("./db-post");
    return (await listPublishedPosts()).map(dbPostToIndexEntry);
  } catch {
    return [];
  }
});
