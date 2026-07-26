import { createFileRoute } from "@tanstack/react-router";
import { ArchivePage } from "@/components/ArchivePage";
import { getSeoRecord } from "@/lib/seo.functions";
import { buildSeoHead } from "@/lib/seo-head";

export const Route = createFileRoute("/category/$catslug/page/$page")({
  loader: async ({ params }) => {
    let s = params.catslug;
    try { s = decodeURIComponent(s); } catch { /* keep */ }
    return { seo: await getSeoRecord({ data: { path: `category/${s}` } }) };
  },
  head: ({ loaderData }) => buildSeoHead(loaderData?.seo),
  component: CategoryArchivePage,
});

function CategoryArchivePage() {
  const { catslug, page } = Route.useParams();
  const slug = decodeURIComponent(catslug);
  const n = Math.max(1, parseInt(page, 10) || 1);
  return <ArchivePage kind="category" page={n} categorySlug={slug} />;
}