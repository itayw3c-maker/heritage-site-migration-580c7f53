import { createFileRoute } from "@tanstack/react-router";
import { ArchivePage } from "@/components/ArchivePage";
import { getSeoRecord } from "@/lib/seo.functions";
import { buildSeoHead } from "@/lib/seo-head";
import { getDbArchivePosts } from "@/lib/content-record.functions";

export const Route = createFileRoute("/category/$catslug/page/$page")({
  loader: async ({ params }) => {
    let s = params.catslug;
    try { s = decodeURIComponent(s); } catch { /* keep */ }
    const [seo, dbPosts] = await Promise.all([
      getSeoRecord({ data: { path: `category/${s}` } }),
      getDbArchivePosts(),
    ]);
    return { seo, dbPosts };
  },
  head: ({ loaderData }) => buildSeoHead(loaderData?.seo),
  component: CategoryArchivePage,
});

function CategoryArchivePage() {
  const { catslug, page } = Route.useParams();
  const { dbPosts } = Route.useLoaderData();
  const slug = decodeURIComponent(catslug);
  const n = Math.max(1, parseInt(page, 10) || 1);
  return <ArchivePage kind="category" page={n} categorySlug={slug} extraPosts={dbPosts} />;
}