import { createFileRoute } from "@tanstack/react-router";
import { ArchivePage } from "@/components/ArchivePage";

export const Route = createFileRoute("/success/")({
  component: SuccessArchive,
});

function SuccessArchive() {
  return <ArchivePage kind="success" page={1} />;
}