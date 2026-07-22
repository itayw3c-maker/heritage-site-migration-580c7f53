import { createFileRoute } from "@tanstack/react-router";
import { ArchivePage } from "@/components/ArchivePage";

export const Route = createFileRoute("/category/$catslug/page/$page")({
  component: CategoryArchivePage,
});

function CategoryArchivePage() {
  const { catslug, page } = Route.useParams();
  const slug = decodeURIComponent(catslug);
  const n = Math.max(1, parseInt(page, 10) || 1);
  return <ArchivePage kind="category" page={n} categorySlug={slug} />;
}