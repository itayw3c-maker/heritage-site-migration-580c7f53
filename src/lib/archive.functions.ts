import { createServerFn } from "@tanstack/react-start";
import { selectArchivePage, archiveSeo, type ArchiveKind } from "./archive";

// The public index is bundled only into the server. Return one page, not the
// complete archive, so SSR and hydration share the same small payload.
export const getArchivePage = createServerFn({ method: "GET" })
  .inputValidator((input: { kind: ArchiveKind; page: number; categorySlug?: string }) => {
    if (!["category", "shorts", "success"].includes(input.kind)) throw new Error("Invalid archive kind");
    return { kind: input.kind, page: Number(input.page), categorySlug: String(input.categorySlug ?? "") };
  })
  .handler(async ({ data }) => {
    const { default: index } = await import("@/generated/archive-index.json");
    let extraPosts: import("./archive").IndexPost[] = [];
    if (data.kind === "category") {
      try {
        const { listPublishedPosts } = await import("./blog.server");
        const { dbPostToIndexEntry } = await import("./db-post");
        extraPosts = (await listPublishedPosts()).map(dbPostToIndexEntry);
      } catch (error) {
        // Imported articles remain available if the optional DB is unavailable.
        console.error("Could not load published archive posts", error);
      }
    }
    const archive = selectArchivePage(index, data, extraPosts);
    if (!archive) return null;
    const { loadSeoRecord } = await import("./seo-data.server");
    const path = data.kind === "category" ? `category/${archive.categorySlug}` : data.kind;
    return { archive, seo: archiveSeo(await loadSeoRecord(path), archive) };
  });
