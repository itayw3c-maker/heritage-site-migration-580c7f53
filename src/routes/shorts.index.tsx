import { createFileRoute } from "@tanstack/react-router";
import { ArchivePage } from "@/components/ArchivePage";
import { getSeoRecord } from "@/lib/seo.functions";
import { buildSeoHead } from "@/lib/seo-head";

export const Route = createFileRoute("/shorts/")({
  loader: async () => ({ seo: await getSeoRecord({ data: { path: "shorts" } }) }),
  head: ({ loaderData }) => buildSeoHead(loaderData?.seo),
  component: ShortsArchive,
});

function ShortsArchive() {
  return <ArchivePage kind="shorts" page={1} />;
}