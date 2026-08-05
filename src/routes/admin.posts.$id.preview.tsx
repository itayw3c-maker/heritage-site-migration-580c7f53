import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SingleTemplate, type SingleType, type SingleRecord } from "@/components/SingleTemplate";

const db = supabase as unknown as { from: (t: string) => any };

export const Route = createFileRoute("/admin/posts/$id/preview")({
  head: () => ({
    meta: [
      { title: "תצוגה מקדימה | ניהול" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PreviewPage,
});

function mapType(pt: string): SingleType {
  switch (pt) {
    case "post":
    case "shorts":
    case "movie":
    case "success":
      return pt;
    case "page":
    default:
      return "service";
  }
}

function PreviewPage() {
  const { id } = Route.useParams();
  const [rec, setRec] = useState<SingleRecord | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [wp, setWp] = useState<{ post_type: string; status: string; title: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await db
        .from("posts")
        .select("wp_id,post_type,status,title,content_html,meta_title,meta_description")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setErr(error?.message ?? "לא נמצא");
        return;
      }
      setWp({ post_type: data.post_type, status: data.status, title: data.title });
      setRec({
        type: mapType(data.post_type),
        id: data.wp_id ?? 0,
        title: data.title || "(בלי כותרת)",
        content_html: data.content_html ?? "",
        meta_title: data.meta_title ?? undefined,
        meta_description: data.meta_description ?? undefined,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 12,
          insetInlineStart: 12,
          zIndex: 100000,
          background: "#063760",
          color: "#fff",
          padding: "8px 14px",
          borderRadius: 8,
          fontSize: 13,
          boxShadow: "0 4px 12px rgba(0,0,0,.2)",
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <span>תצוגה מקדימה — {wp?.status ?? "…"}</span>
        <Link
          to="/admin/posts/$id/"
          params={{ id }}
          style={{ color: "#CBA436", textDecoration: "underline" }}
        >
          חזור לעריכה
        </Link>
      </div>
      {err && <div style={{ padding: 40 }}>שגיאה: {err}</div>}
      {rec && <SingleTemplate record={rec} />}
    </>
  );
}