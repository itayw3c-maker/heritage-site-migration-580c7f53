import { createFileRoute } from "@tanstack/react-router";
import { ArchivePage } from "@/components/ArchivePage";

export const Route = createFileRoute("/shorts/")({
  component: ShortsArchive,
});

function ShortsArchive() {
  return <ArchivePage kind="shorts" page={1} />;
}