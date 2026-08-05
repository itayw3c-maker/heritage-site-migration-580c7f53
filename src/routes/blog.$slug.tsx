// Legacy /blog/<slug>/ URL — permanent redirect to the root-level article URL.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/blog/$slug")({
  beforeLoad: ({ params }) => {
    let slug = params.slug;
    try { slug = decodeURIComponent(slug); } catch { /* keep raw */ }
    throw redirect({ href: `/${encodeURIComponent(slug)}/`, statusCode: 301 } as unknown as Parameters<typeof redirect>[0]);
  },
});
