import { createFileRoute } from "@tanstack/react-router";
import { ArchivePage } from "@/components/ArchivePage";

export const Route = createFileRoute("/success/page/$page")({
  component: SuccessArchivePage,
});

function SuccessArchivePage() {
  const { page } = Route.useParams();
  const n = Math.max(1, parseInt(page, 10) || 1);
  return <ArchivePage kind="success" page={n} />;
}