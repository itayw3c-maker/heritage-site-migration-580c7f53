import { createFileRoute } from "@tanstack/react-router";
import { ArchivePage } from "@/components/ArchivePage";
import { getSeoRecord } from "@/lib/seo.functions";
import { buildSeoHead } from "@/lib/seo-head";
import { getDbArchivePosts } from "@/lib/content-record.functions";

export const Route = createFileRoute("/category/$catslug/")({
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
  component: CategoryArchive,
});

function CategoryArchive() {
  const { catslug } = Route.useParams();
  const { dbPosts } = Route.useLoaderData();
  const slug = decodeURIComponent(catslug);
  return <ArchivePage kind="category" page={1} categorySlug={slug} extraPosts={dbPosts} />;
}