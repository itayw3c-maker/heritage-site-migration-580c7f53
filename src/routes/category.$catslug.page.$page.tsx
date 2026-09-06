import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArchivePage } from "@/components/ArchivePage";
import { getArchivePage } from "@/lib/archive.functions";
import { buildSeoHead } from "@/lib/seo-head";

export const Route = createFileRoute("/category/$catslug/page/$page")({
  loader: async ({ params }) => {
    const data = await getArchivePage({ data: { kind: "category", page: Number(params.page), categorySlug: params.catslug } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => loaderData
    ? buildSeoHead(loaderData.seo)
    : { meta: [{ title: "העמוד לא נמצא | רפאל שמאות רכוש" }, { name: "robots", content: "noindex, follow" }] },
  component: Archive,
});

function Archive() {
  const { archive } = Route.useLoaderData();
  return <ArchivePage archive={archive} />;
}
