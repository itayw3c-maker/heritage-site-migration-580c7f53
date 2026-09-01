// Publish API for the external "Service Content Master" pipeline.
// Auth: Authorization: Bearer <PUBLISH_TOKEN> only.
import { createFileRoute } from "@tanstack/react-router";
import type { Json } from "@/integrations/supabase/types";
import { resolveCategory } from "@/lib/db-post";
import { sanitizeArticleHtml } from "@/lib/html-sanitize.server";
import { audit, clientKey, rateLimit } from "@/lib/abuse-guard.server";

const SITE = "https://www.rrshamaut.co.il";

// The documented consumer is a server-to-server pipeline, so no browser
// origin needs cross-origin access. CORS is therefore not advertised at all;
// only a documented origin list (if ever configured) may be echoed back.
const ALLOWED_ORIGINS = (process.env["PUBLISH_ALLOWED_ORIGINS"] ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function corsHeaders(request?: Request): Record<string, string> {
  const origin = request?.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return { Vary: "Origin" };
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

// Application-layer limits (no DB policy involved):
//   POST   30 requests / 5 min per client
//   DELETE  5 requests / 5 min per client, and off unless explicitly enabled
const WINDOW_MS = 5 * 60 * 1000;
const POST_LIMIT = 30;
const DELETE_LIMIT = 5;
const MAX_BODY_BYTES = 512 * 1024;

function deleteEnabled(): boolean {
  return (process.env["PUBLISH_ALLOW_DELETE"] ?? "").toLowerCase() === "true";
}

function json(body: unknown, status = 200, request?: Request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...corsHeaders(request),
    },
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
  category?: unknown;
}

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() !== "" ? v : null;

export const Route = createFileRoute("/api/public/publish-article")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, { status: 204, headers: corsHeaders(request) }),

      POST: async ({ request }) => {
        const key = clientKey(request);
        if (!authorized(request)) {
          audit("publish.unauthorized", { method: "POST", client: key });
          return json({ error: "Unauthorized" }, 401, request);
        }
        const limit = rateLimit(`publish:post:${key}`, POST_LIMIT, WINDOW_MS);
        if (!limit.allowed) {
          audit("publish.rate_limited", { method: "POST", client: key });
          return new Response(
            JSON.stringify({ error: "Too many requests" }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": String(limit.retryAfterSeconds),
                ...corsHeaders(request),
              },
            },
          );
        }

        const raw = await request.text();
        if (raw.length > MAX_BODY_BYTES) {
          audit("publish.payload_too_large", { client: key, bytes: raw.length });
          return json({ error: "Payload too large" }, 413, request);
        }

        let body: Payload;
        try {
          body = JSON.parse(raw) as Payload;
        } catch {
          return json({ error: "Invalid JSON body" }, 400, request);
        }
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          return json({ error: "Invalid JSON body" }, 400, request);
        }

        const title = str(body.title);
        const rawHtml = str(body.body_html);
        if (!title) return json({ error: "title is required" }, 400, request);
        if (!rawHtml) return json({ error: "body_html is required" }, 400, request);

        // Server-side allowlist sanitization happens before anything is
        // persisted: scripts, event handlers and javascript: URLs cannot
        // reach the database, let alone a rendered page.
        const sanitized = sanitizeArticleHtml(rawHtml);
        const bodyHtml = sanitized.html;
        if (!bodyHtml.trim()) {
          return json({ error: "body_html contained no allowed content" }, 422, request);
        }
        if (
          sanitized.removedTags.length ||
          sanitized.removedAttributes.length ||
          sanitized.blockedUrls
        ) {
          audit("publish.sanitized", {
            client: key,
            removed_tags: sanitized.removedTags.join(",").slice(0, 200),
            removed_attributes: sanitized.removedAttributes.join(",").slice(0, 200),
            blocked_urls: sanitized.blockedUrls,
          });
        }

        const rawStatus = typeof body.status === "string" ? body.status : "draft";
        if (rawStatus !== "draft" && rawStatus !== "publish") {
          return json({ error: "status must be 'draft' or 'publish'" }, 400);
        }
        const status = rawStatus === "publish" ? "published" : "draft";
        const slug = str(body.slug) ? slugify(String(body.slug)) : slugify(title);

        const categoryId = resolveCategory(body.category, `${title}\n${bodyHtml}`);

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
          category_id: categoryId,
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
        if (findError) {
          audit("publish.db_error", { client: key, stage: "lookup" });
          return json({ error: "Database error" }, 500, request);
        }

        let id: string;
        if (existing?.id) {
          const { data, error } = await supabaseAdmin
            .from("posts")
            .update(row)
            .eq("id", existing.id)
            .select("id")
            .single();
          if (error) {
            audit("publish.db_error", { client: key, stage: "update" });
            return json({ error: "Database error" }, 500, request);
          }
          id = data.id;
        } else {
          const { data, error } = await supabaseAdmin
            .from("posts")
            .insert(row)
            .select("id")
            .single();
          if (error) {
            audit("publish.db_error", { client: key, stage: "insert" });
            return json({ error: "Database error" }, 500, request);
          }
          id = data.id;
        }

        audit("publish.ok", {
          client: key,
          slug,
          status,
          updated: Boolean(existing?.id),
          html_bytes: bodyHtml.length,
        });

        return json({
          id,
          slug,
          status,
          category_id: categoryId,
          url: `${SITE}/${slug}/`,
        }, 200, request);
      },

      // Destructive path: blocked by default. It only becomes available when
      // PUBLISH_ALLOW_DELETE=true is set for the environment, and even then it
      // soft-deletes (status -> draft) instead of destroying rows.
      DELETE: async ({ request }) => {
        const key = clientKey(request);
        if (!authorized(request)) {
          audit("publish.unauthorized", { method: "DELETE", client: key });
          return json({ error: "Unauthorized" }, 401, request);
        }
        if (!deleteEnabled()) {
          audit("publish.delete_blocked", { client: key });
          return json({ error: "Delete is disabled for this endpoint" }, 405, request);
        }
        const limit = rateLimit(`publish:delete:${key}`, DELETE_LIMIT, WINDOW_MS);
        if (!limit.allowed) {
          audit("publish.rate_limited", { method: "DELETE", client: key });
          return json({ error: "Too many requests" }, 429, request);
        }
        let body: { id?: unknown };
        try {
          body = (await request.json()) as { id?: unknown };
        } catch {
          return json({ error: "Invalid JSON body" }, 400, request);
        }
        const id = str(body.id);
        if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
          return json({ error: "id is required" }, 400, request);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("posts")
          .update({ status: "draft" })
          .eq("id", id);
        if (error) {
          audit("publish.db_error", { client: key, stage: "delete" });
          return json({ error: "Database error" }, 500, request);
        }
        audit("publish.unpublished", { client: key, id });
        return json({ ok: true }, 200, request);
      },
    },
  },
});