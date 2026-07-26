import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
const db = supabase as unknown as { from: (t: string) => any };
import { RichEditor } from "@/components/admin/RichEditor";

type Post = {
  id: string;
  post_type: string;
  slug: string;
  title: string;
  content_html: string | null;
  excerpt: string | null;
  featured_image: string | null;
  meta_title: string | null;
  meta_description: string | null;
  status: "draft" | "scheduled" | "published";
  publish_at: string | null;
};

export const Route = createFileRoute("/admin/posts/$id")({
  head: () => ({
    meta: [
      { title: "עריכת רשומה | ניהול" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: EditPost,
});

function toLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocal(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function EditPost() {
  const { id } = Route.useParams();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await db.from("posts").select("*").eq("id", id).maybeSingle();
      if (error) setErr(error.message);
      else if (!data) setErr("הרשומה לא נמצאה");
      else setPost(data as Post);
    })();
  }, [id]);

  function patch<K extends keyof Post>(k: K, v: Post[K]) {
    setPost((p) => (p ? { ...p, [k]: v } : p));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!post) return;
    setSaving(true);
    setMsg(null);
    const payload = {
      title: post.title,
      slug: post.slug,
      content_html: post.content_html ?? "",
      excerpt: post.excerpt,
      featured_image: post.featured_image,
      meta_title: post.meta_title,
      meta_description: post.meta_description,
      status: post.status,
      publish_at: post.status === "scheduled" ? post.publish_at : null,
    };
    const { error } = await db.from("posts").update(payload).eq("id", post.id);
    setSaving(false);
    if (error) setMsg({ kind: "err", text: `שמירה נכשלה: ${error.message}` });
    else setMsg({ kind: "ok", text: "נשמר בהצלחה" });
  }

  if (err) return <div className="admin-page"><div className="admin-msg admin-msg--err">{err}</div></div>;
  if (!post) return <div className="admin-page"><div className="admin-empty">טוען…</div></div>;

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <button type="button" className="admin-btn admin-btn--ghost" onClick={() => router.navigate({ to: "/admin/posts" })}>→ חזרה לרשימה</button>
        <h1 className="admin-page__title">עריכת רשומה</h1>
        <a
          href={`/admin/posts/${id}/preview`}
          target="_blank"
          rel="noreferrer"
          className="admin-btn admin-btn--ghost"
          style={{ marginInlineStart: "auto" }}
        >
          תצוגה מקדימה ↗
        </a>
      </div>
      <form onSubmit={save} className="admin-form">
        <div className="admin-form__grid">
          <div className="admin-form__main">
            <label className="admin-field">
              <span>כותרת</span>
              <input value={post.title} onChange={(e) => patch("title", e.target.value)} />
            </label>
            <label className="admin-field">
              <span>סלאג</span>
              <input value={post.slug} onChange={(e) => patch("slug", e.target.value)} dir="ltr" />
            </label>
            <div className="admin-field">
              <span>תוכן</span>
              <RichEditor
                value={post.content_html ?? ""}
                onChange={(html) => patch("content_html", html)}
              />
            </div>
            <label className="admin-field">
              <span>תקציר (excerpt)</span>
              <textarea rows={3} value={post.excerpt ?? ""} onChange={(e) => patch("excerpt", e.target.value)} />
            </label>
            <label className="admin-field">
              <span>meta title</span>
              <input value={post.meta_title ?? ""} onChange={(e) => patch("meta_title", e.target.value)} />
            </label>
            <label className="admin-field">
              <span>meta description</span>
              <textarea rows={2} value={post.meta_description ?? ""} onChange={(e) => patch("meta_description", e.target.value)} />
            </label>
            <label className="admin-field">
              <span>תמונה ראשית (URL)</span>
              <input value={post.featured_image ?? ""} onChange={(e) => patch("featured_image", e.target.value)} dir="ltr" />
            </label>
          </div>
          <aside className="admin-form__side">
            <div className="admin-card">
              <h2 className="admin-card__title">פרסום</h2>
              <label className="admin-field">
                <span>סטטוס</span>
                <select value={post.status} onChange={(e) => patch("status", e.target.value as Post["status"])}>
                  <option value="draft">טיוטה</option>
                  <option value="scheduled">מתוזמן</option>
                  <option value="published">פורסם</option>
                </select>
              </label>
              {post.status === "scheduled" && (
                <label className="admin-field">
                  <span>מועד פרסום</span>
                  <input
                    type="datetime-local"
                    value={toLocal(post.publish_at)}
                    onChange={(e) => patch("publish_at", fromLocal(e.target.value))}
                  />
                </label>
              )}
              <div className="admin-field">
                <span>סוג</span>
                <div className="admin-muted">{post.post_type}</div>
              </div>
              <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
                {saving ? "שומר…" : "שמור"}
              </button>
              {msg && <div className={`admin-msg admin-msg--${msg.kind}`}>{msg.text}</div>}
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}