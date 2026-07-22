import { createFileRoute } from "@tanstack/react-router";
import { ArchivePage } from "@/components/ArchivePage";

export const Route = createFileRoute("/category/$catslug/")({
  component: CategoryArchive,
});

function CategoryArchive() {
  const { catslug } = Route.useParams();
  const slug = decodeURIComponent(catslug);
  return <ArchivePage kind="category" page={1} categorySlug={slug} />;
}