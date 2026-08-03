// Live sitemap for /blog articles (DB-driven, so it stays in sync with the
// publish API). Referenced from public/robots.txt alongside the static sitemap.
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

        const urls = [
          `  <url>\n    <loc>${SITE}/blog/</loc>\n  </url>`,
          ...posts.map(
            (p) =>
              `  <url>\n    <loc>${SITE}/blog/${encodeURIComponent(p.slug)}</loc>\n    <lastmod>${p.updated_at.slice(0, 10)}</lastmod>\n  </url>`,
          ),
        ];

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