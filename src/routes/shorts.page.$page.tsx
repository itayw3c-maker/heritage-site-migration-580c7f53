import { createFileRoute } from "@tanstack/react-router";
import { ArchivePage } from "@/components/ArchivePage";

export const Route = createFileRoute("/shorts/page/$page/")({
  component: ShortsArchivePage,
});

function ShortsArchivePage() {
  const { page } = Route.useParams();
  const n = Math.max(1, parseInt(page, 10) || 1);
  return <ArchivePage kind="shorts" page={n} />;
}