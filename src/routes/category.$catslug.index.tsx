import { createFileRoute } from "@tanstack/react-router";
import { ArchivePage } from "@/components/ArchivePage";
import { getSeoRecord } from "@/lib/seo.functions";
import { buildSeoHead } from "@/lib/seo-head";

export const Route = createFileRoute("/category/$catslug/")({
  loader: async ({ params }) => {
    let s = params.catslug;
    try { s = decodeURIComponent(s); } catch { /* keep */ }
    return { seo: await getSeoRecord({ data: { path: `category/${s}` } }) };
  },
  head: ({ loaderData }) => buildSeoHead(loaderData?.seo),
  component: CategoryArchive,
});

function CategoryArchive() {
  const { catslug } = Route.useParams();
  const slug = decodeURIComponent(catslug);
  return <ArchivePage kind="category" page={1} categorySlug={slug} />;
}