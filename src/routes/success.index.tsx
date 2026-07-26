import { createFileRoute } from "@tanstack/react-router";
import { ArchivePage } from "@/components/ArchivePage";
import { getSeoRecord } from "@/lib/seo.functions";
import { buildSeoHead } from "@/lib/seo-head";

export const Route = createFileRoute("/success/")({
  loader: async () => ({ seo: await getSeoRecord({ data: { path: "success" } }) }),
  head: ({ loaderData }) => buildSeoHead(loaderData?.seo),
  component: SuccessArchive,
});

function SuccessArchive() {
  return <ArchivePage kind="success" page={1} />;
}