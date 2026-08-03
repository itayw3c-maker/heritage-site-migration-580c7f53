import { createServerFn } from "@tanstack/react-start";
import type { BlogPost } from "./blog.server";

export const getBlogList = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ posts: BlogPost[] }> => {
    const { listPublishedPosts } = await import("./blog.server");
    try {
      return { posts: await listPublishedPosts() };
    } catch {
      return { posts: [] };
    }
  },
);

export const getBlogPost = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: String(d?.slug ?? "") }))
  .handler(async ({ data }): Promise<{ post: BlogPost | null }> => {
    if (!data.slug) return { post: null };
    const { getPublishedPost } = await import("./blog.server");
    try {
      return { post: await getPublishedPost(data.slug) };
    } catch {
      return { post: null };
    }
  });