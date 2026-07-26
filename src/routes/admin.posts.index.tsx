import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
const db = supabase as unknown as {
  from: (t: string) => any;
  rpc: (fn: string) => any;
};

type Row = {
  id: string;
  title: string;
  slug: string;
  post_type: string;
  status: "draft" | "scheduled" | "published";
  publish_at: string | null;
  updated_at: string;
};

export const Route = createFileRoute("/admin/posts/")({
  head: () => ({
    meta: [
      { title: "רשומות | ניהול" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PostsList,
});

function fmt(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });
}

const STATUS_LABEL: Record<string, string> = {
  draft: "טיוטה",
  scheduled: "מתוזמן",
  published: "פורסם",
};

function PostsList() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await db
        .from("posts")
        .select("id,title,slug,post_type,status,publish_at,updated_at")
        .order("updated_at", { ascending: false });
      if (error) setErr(error.message);
      else setRows((data ?? []) as Row[]);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (q && !r.title.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [rows, statusFilter, q]);

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <h1 className="admin-page__title">רשומות</h1>
      </div>
      <div className="admin-toolbar">
        <input
          type="search"
          placeholder="חיפוש בכותרת…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="admin-input"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="admin-input">
          <option value="all">כל הסטטוסים</option>
          <option value="draft">טיוטה</option>
          <option value="scheduled">מתוזמן</option>
          <option value="published">פורסם</option>
        </select>
      </div>
      {err && <div className="admin-msg admin-msg--err">{err}</div>}
      {rows === null ? (
        <div className="admin-empty">טוען…</div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">לא נמצאו רשומות</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>כותרת</th>
                <th>סוג</th>
                <th>סטטוס</th>
                <th>תזמון</th>
                <th>עודכן</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to="/admin/posts/$id" params={{ id: r.id }} className="admin-link">
                      {r.title || <em>ללא כותרת</em>}
                    </Link>
                    <div className="admin-muted">/{r.slug}</div>
                  </td>
                  <td>{r.post_type}</td>
                  <td>
                    <span className={`admin-status admin-status--${r.status}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td>{fmt(r.publish_at)}</td>
                  <td>{fmt(r.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}