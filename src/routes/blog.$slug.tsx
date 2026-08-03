import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getBlogPost } from "@/lib/blog.functions";
import type { BlogPost } from "@/lib/blog.server";
import { BLOG_CSS } from "@/lib/blog-styles";

const SITE = "https://www.rrshamaut.co.il";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const slug = decodeURIComponent(params.slug);
    const { post } = await getBlogPost({ data: { slug } });
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData, params }) => {
    const post = loaderData?.post as BlogPost | undefined;
    if (!post) {
      return { meta: [{ name: "robots", content: "noindex, nofollow" }] };
    }
    const url = `${SITE}/blog/${encodeURIComponent(params.slug)}/`;
    const title = post.meta_title || post.h1 || post.title;
    const description = post.meta_description || post.excerpt || "";
    const image = post.featured_image
      ? post.featured_image.startsWith("http")
        ? post.featured_image
        : `${SITE}${post.featured_image}`
      : null;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { property: "og:site_name", content: "רפאל שמאות רכוש" },
      { property: "og:locale", content: "he_IL" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ];
    if (image) {
      meta.push({ property: "og:image", content: image });
      meta.push({ name: "twitter:image", content: image });
    }
    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      scripts: post.schema_jsonld
        ? [{ type: "application/ld+json", children: post.schema_jsonld }]
        : [],
    };
  },
  component: ArticlePage,
  notFoundComponent: () => (
    <main className="rr-article" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: BLOG_CSS }} />
      <div className="rr-article-wrap">
        <h1>המאמר לא נמצא</h1>
        <p>
          <Link className="rr-blog-more" to="/blog">
            חזרה לכל המאמרים
          </Link>
        </p>
      </div>
    </main>
  ),
});

function ArticlePage() {
  const { post } = Route.useLoaderData() as { post: BlogPost };
  const date = post.publish_at || post.created_at;
  return (
    <main className="rr-article" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: BLOG_CSS }} />
      <article className="rr-article-wrap">
        <header>
          <h1>{post.h1 || post.title}</h1>
          {date ? (
            <p className="rr-article-meta">
              <time dateTime={date}>
                {new Date(date).toLocaleDateString("he-IL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </time>
            </p>
          ) : null}
        </header>

        {post.featured_image ? (
          <img
            className="rr-article-hero"
            src={post.featured_image}
            alt={post.h1 || post.title}
          />
        ) : null}

        <div
          className="rr-article-body"
          dangerouslySetInnerHTML={{ __html: post.content_html || "" }}
        />

        {post.faq_json && post.faq_json.length > 0 ? (
          <section className="rr-faq" aria-label="שאלות ותשובות">
            <h2>שאלות ותשובות</h2>
            {post.faq_json.map((item, i) => (
              <details key={i}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </section>
        ) : null}

        {post.cta ? (
          <aside className="rr-cta">
            <p>{post.cta}</p>
          </aside>
        ) : null}

        <p style={{ marginTop: "32px" }}>
          <Link className="rr-blog-more" to="/blog">
            ← חזרה לכל המאמרים
          </Link>
        </p>
      </article>
    </main>
  );
}