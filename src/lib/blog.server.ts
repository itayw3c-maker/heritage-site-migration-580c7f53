// Server-only Supabase reads for the /blog pages. Uses the publishable key with
// the existing public SELECT policy on posts (published + publish_at due), so no
// service-role access is needed for public reads.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  h1: string | null;
  content_html: string | null;
  excerpt: string | null;
  featured_image: string | null;
  meta_title: string | null;
  meta_description: string | null;
  cta: string | null;
  faq_json: Array<{ question: string; answer: string }> | null;
  schema_jsonld: unknown | null;
  publish_at: string | null;
  created_at: string;
  updated_at: string;
}

const COLUMNS =
  "id, slug, title, h1, content_html, excerpt, featured_image, meta_title, meta_description, cta, faq_json, schema_jsonld, publish_at, created_at, updated_at";

export function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

function normalize(row: Record<string, unknown>): BlogPost {
  const faq = row["faq_json"];
  return {
    ...(row as unknown as BlogPost),
    faq_json: Array.isArray(faq)
      ? (faq as Array<{ question: string; answer: string }>).filter(
          (i) => i && typeof i === "object",
        )
      : null,
  };
}

export async function listPublishedPosts(): Promise<BlogPost[]> {
  const sb = publicClient();
  const { data, error } = await sb
    .from("posts")
    .select(COLUMNS)
    .eq("status", "published")
    .eq("post_type", "post")
    .order("publish_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  const now = Date.now();
  return (data ?? [])
    .map((r) => normalize(r as unknown as Record<string, unknown>))
    .filter((p) => !p.publish_at || new Date(p.publish_at).getTime() <= now);
}

export async function getPublishedPost(slug: string): Promise<BlogPost | null> {
  const sb = publicClient();
  const { data, error } = await sb
    .from("posts")
    .select(COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const post = normalize(data as unknown as Record<string, unknown>);
  if (post.publish_at && new Date(post.publish_at).getTime() > Date.now()) return null;
  return post;
}