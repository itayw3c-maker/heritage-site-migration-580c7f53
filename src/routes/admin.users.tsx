import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as { from: (t: string) => any };

type AdminEmail = { email: string; created_at: string };
type AdminRow = { user_id: string; email: string | null; created_at: string };

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "משתמשי ניהול | ניהול" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: UsersPage,
});

function fmt(d: string) {
  return new Date(d).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });
}

function UsersPage() {
  const [emails, setEmails] = useState<AdminEmail[] | null>(null);
  const [admins, setAdmins] = useState<AdminRow[] | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [e, a] = await Promise.all([
      db.from("admin_emails").select("*").order("created_at", { ascending: false }),
      db.from("admins").select("*").order("created_at", { ascending: false }),
    ]);
    if (e.data) setEmails(e.data);
    if (a.data) setAdmins(a.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function addEmail(e: React.FormEvent) {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    setBusy(true);
    setMsg(null);
    const { error } = await db.from("admin_emails").insert({ email });
    setBusy(false);
    if (error) {
      setMsg({ kind: "err", text: `הוספה נכשלה: ${error.message}` });
    } else {
      setNewEmail("");
      setMsg({ kind: "ok", text: "נוסף לרשימה" });
      load();
    }
  }

  async function removeEmail(email: string) {
    if (!confirm(`להסיר את ${email} מרשימת האדמינים?`)) return;
    const { error } = await db.from("admin_emails").delete().eq("email", email);
    if (error) setMsg({ kind: "err", text: `הסרה נכשלה: ${error.message}` });
    else {
      setMsg({ kind: "ok", text: "הוסר" });
      load();
    }
  }

  async function revokeAdmin(user_id: string) {
    if (!confirm("לבטל את הרשאת האדמין של המשתמש הזה? הוא יישאר משתמש מחובר אבל בלי גישה לניהול.")) return;
    const { error } = await db.from("admins").delete().eq("user_id", user_id);
    if (error) setMsg({ kind: "err", text: `ביטול נכשל: ${error.message}` });
    else {
      setMsg({ kind: "ok", text: "בוטל" });
      load();
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <h1 className="admin-page__title">משתמשי ניהול</h1>
      </div>
      {msg && <div className={`admin-msg admin-msg--${msg.kind}`}>{msg.text}</div>}
      <div className="admin-form__grid">
        <div className="admin-form__main">
          <div className="admin-card">
            <h2 className="admin-card__title">רשימת אדמינים מאושרת (allowlist)</h2>
            <p className="admin-muted" style={{ marginBottom: 12 }}>
              אימיילים שנמצאים כאן — ברגע שהמשתמש שלהם יירשם ויאמת את האימייל, הוא יקבל אוטומטית הרשאת ניהול.
            </p>
            <form onSubmit={addEmail} className="admin-toolbar" style={{ marginBottom: 12 }}>
              <input
                className="admin-input"
                type="email"
                placeholder="user@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                dir="ltr"
                required
              />
              <button type="submit" className="admin-btn admin-btn--primary" disabled={busy}>
                {busy ? "מוסיף…" : "הוסף"}
              </button>
            </form>
            {emails === null ? (
              <div className="admin-empty">טוען…</div>
            ) : emails.length === 0 ? (
              <div className="admin-empty">אין אימיילים ברשימה</div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>אימייל</th>
                      <th>נוסף</th>
                      <th style={{ width: 100 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {emails.map((r) => (
                      <tr key={r.email}>
                        <td dir="ltr">{r.email}</td>
                        <td>{fmt(r.created_at)}</td>
                        <td>
                          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => removeEmail(r.email)}>
                            הסר
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <aside className="admin-form__side">
          <div className="admin-card">
            <h2 className="admin-card__title">אדמינים מחוברים בפועל</h2>
            {admins === null ? (
              <div className="admin-empty">טוען…</div>
            ) : admins.length === 0 ? (
              <div className="admin-empty">אין אדמינים רשומים</div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {admins.map((a) => (
                  <li key={a.user_id} style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div dir="ltr" style={{ fontWeight: 600 }}>{a.email ?? a.user_id}</div>
                    <div className="admin-muted">מחובר מאז {fmt(a.created_at)}</div>
                    <button
                      type="button"
                      className="admin-btn admin-btn--ghost"
                      style={{ marginTop: 4 }}
                      onClick={() => revokeAdmin(a.user_id)}
                    >
                      בטל הרשאה
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}