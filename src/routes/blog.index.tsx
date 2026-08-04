// Legacy /blog/ URL — briefly live before articles moved to root-level slugs.
// Permanent redirect into the existing articles archive.
import { createFileRoute, redirect } from "@tanstack/react-router";

const ARTICLES_ARCHIVE = `/category/${encodeURIComponent("מידע-מקצועי")}/`;

export const Route = createFileRoute("/blog/")({
  beforeLoad: () => {
    throw redirect({ href: ARTICLES_ARCHIVE, statusCode: 301 });
  },
});
