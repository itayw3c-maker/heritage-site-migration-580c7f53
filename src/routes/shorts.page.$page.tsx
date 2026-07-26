import { createFileRoute } from "@tanstack/react-router";
import { ArchivePage } from "@/components/ArchivePage";
import { getSeoRecord } from "@/lib/seo.functions";
import { buildSeoHead } from "@/lib/seo-head";

export const Route = createFileRoute("/shorts/page/$page")({
  loader: async () => ({ seo: await getSeoRecord({ data: { path: "shorts" } }) }),
  head: ({ loaderData }) => buildSeoHead(loaderData?.seo),
  component: ShortsArchivePage,
});

function ShortsArchivePage() {
  const { page } = Route.useParams();
  const n = Math.max(1, parseInt(page, 10) || 1);
  return <ArchivePage kind="shorts" page={n} />;
}