// Publish API for the external "Service Content Master" pipeline.
// Auth: Authorization: Bearer <PUBLISH_TOKEN> only.
import { createFileRoute } from "@tanstack/react-router";
import type { Json } from "@/integrations/supabase/types";

const SITE = "https://www.rrshamaut.co.il";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function authorized(request: Request): boolean {
  const token = process.env["PUBLISH_TOKEN"];
  if (!token) return false;
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return false;
  const given = match[1]!.trim();
  if (given.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= given.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

function slugify(input: string): string {
  const base = (input || "")
    .toLowerCase()
    .replace(/[\u0590-\u05FF]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || `post-${Date.now()}`;
}

interface Payload {
  title?: unknown;
  h1?: unknown;
  slug?: unknown;
  body_html?: unknown;
  excerpt?: unknown;
  meta_title?: unknown;
  meta_description?: unknown;
  faq_json?: unknown;
  schema_jsonld?: unknown;
  cta?: unknown;
  status?: unknown;
  published_at?: unknown;
}

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() !== "" ? v : null;

export const Route = createFileRoute("/api/public/publish-article")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      POST: async ({ request }) => {
        if (!authorized(request)) return json({ error: "Unauthorized" }, 401);

        let body: Payload;
        try {
          body = (await request.json()) as Payload;
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }

        const title = str(body.title);
        const bodyHtml = str(body.body_html);
        if (!title) return json({ error: "title is required" }, 400);
        if (!bodyHtml) return json({ error: "body_html is required" }, 400);

        const rawStatus = typeof body.status === "string" ? body.status : "draft";
        if (rawStatus !== "draft" && rawStatus !== "publish") {
          return json({ error: "status must be 'draft' or 'publish'" }, 400);
        }
        const status = rawStatus === "publish" ? "published" : "draft";
        const slug = str(body.slug) ? slugify(String(body.slug)) : slugify(title);

        const row = {
          post_type: "post",
          slug,
          title,
          h1: str(body.h1),
          content_html: bodyHtml,
          excerpt: str(body.excerpt),
          meta_title: str(body.meta_title),
          meta_description: str(body.meta_description),
          faq_json: (Array.isArray(body.faq_json) ? body.faq_json : null) as Json,
          schema_jsonld:
            body.schema_jsonld && typeof body.schema_jsonld === "object"
              ? (body.schema_jsonld as Json)
              : null,
          cta: str(body.cta),
          status,
          publish_at:
            str(body.published_at) ?? (status === "published" ? new Date().toISOString() : null),
        };

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: existing, error: findError } = await supabaseAdmin
          .from("posts")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (findError) return json({ error: findError.message }, 500);

        let id: string;
        if (existing?.id) {
          const { data, error } = await supabaseAdmin
            .from("posts")
            .update(row)
            .eq("id", existing.id)
            .select("id")
            .single();
          if (error) return json({ error: error.message }, 500);
          id = data.id;
        } else {
          const { data, error } = await supabaseAdmin
            .from("posts")
            .insert(row)
            .select("id")
            .single();
          if (error) return json({ error: error.message }, 500);
          id = data.id;
        }

        return json({ id, slug, status, url: `${SITE}/blog/${slug}/` });
      },

      DELETE: async ({ request }) => {
        if (!authorized(request)) return json({ error: "Unauthorized" }, 401);
        let body: { id?: unknown };
        try {
          body = (await request.json()) as { id?: unknown };
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }
        const id = str(body.id);
        if (!id) return json({ error: "id is required" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("posts").delete().eq("id", id);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      },
    },
  },
});