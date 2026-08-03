import { createFileRoute, Link } from "@tanstack/react-router";
import { getBlogList } from "@/lib/blog.functions";
import type { BlogPost } from "@/lib/blog.server";
import { BLOG_CSS } from "@/lib/blog-styles";

const SITE = "https://www.rrshamaut.co.il";
const TITLE = "מאמרים מקצועיים בשמאות רכוש | רפאל שמאות רכוש";
const DESC =
  "מאמרים ומדריכים מקצועיים בנושאי שמאות רכוש, נזקי מים, אש, פריצה וניהול תביעות ביטוח.";

export const Route = createFileRoute("/blog/")({
  loader: async () => await getBlogList(),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE}/blog/` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE}/blog/` }],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const { posts } = Route.useLoaderData() as { posts: BlogPost[] };
  return (
    <main className="rr-blog" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: BLOG_CSS }} />
      <div className="rr-blog-wrap">
        <h1 className="rr-blog-title">מאמרים מקצועיים</h1>
        {posts.length === 0 ? (
          <p className="rr-blog-empty">בקרוב יעלו כאן מאמרים חדשים.</p>
        ) : (
          <ul className="rr-blog-grid">
            {posts.map((p) => (
              <li key={p.id} className="rr-blog-card">
                {p.featured_image ? (
                  <Link to="/blog/$slug" params={{ slug: p.slug }} aria-label={p.title}>
                    <img
                      className="rr-blog-card-img"
                      src={p.featured_image}
                      alt={p.title}
                      loading="lazy"
                    />
                  </Link>
                ) : null}
                <h2 className="rr-blog-card-title">
                  <Link to="/blog/$slug" params={{ slug: p.slug }}>
                    {p.h1 || p.title}
                  </Link>
                </h2>
                {p.excerpt ? <p className="rr-blog-card-ex">{p.excerpt}</p> : null}
                <Link className="rr-blog-more" to="/blog/$slug" params={{ slug: p.slug }}>
                  קרא עוד
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}