// Live sitemap for DB-published articles (kept in sync with the publish API).
// Articles are served at root-level slugs, exactly like the migrated content.
// Referenced from public/robots.txt alongside the build-time static sitemap.
import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const SITE = "https://www.rrshamaut.co.il";

export const Route = createFileRoute("/blog-sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        let posts: Array<{ slug: string; updated_at: string }> = [];
        try {
          const { listPublishedPosts } = await import("@/lib/blog.server");
          posts = (await listPublishedPosts()).map((p) => ({
            slug: p.slug,
            updated_at: p.updated_at,
          }));
        } catch {
          posts = [];
        }

        const urls = posts.map(
          (p) =>
            `  <url>\n    <loc>${SITE}/${encodeURIComponent(p.slug)}/</loc>\n    <lastmod>${p.updated_at.slice(0, 10)}</lastmod>\n  </url>`,
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=900",
          },
        });
      },
    },
  },
});