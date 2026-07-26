import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "התחברות | ניהול" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "reset">("login");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      setLoading(false);
      setMsg({ kind: "err", text: "פרטי ההתחברות שגויים" });
      return;
    }
    const { data: isAdminData } = await supabase.rpc("is_admin");
    if (!isAdminData) {
      await supabase.auth.signOut();
      setLoading(false);
      setMsg({ kind: "err", text: "אין לחשבון הזה הרשאת ניהול" });
      return;
    }
    setLoading(false);
    router.navigate({ to: "/admin/posts" });
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/login`,
    });
    setLoading(false);
    if (error) {
      setMsg({ kind: "err", text: "שליחת הקישור נכשלה" });
    } else {
      setMsg({ kind: "ok", text: "נשלח קישור לאיפוס סיסמה לאימייל" });
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-card admin-login__form" onSubmit={mode === "login" ? handleLogin : handleReset}>
        <h1 className="admin-login__title">{mode === "login" ? "התחברות למערכת" : "איפוס סיסמה"}</h1>
        <label className="admin-field">
          <span>אימייל</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </label>
        {mode === "login" && (
          <label className="admin-field">
            <span>סיסמה</span>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
        )}
        {msg && <div className={`admin-msg admin-msg--${msg.kind}`}>{msg.text}</div>}
        <button type="submit" className="admin-btn admin-btn--primary" disabled={loading}>
          {loading ? "רגע…" : mode === "login" ? "התחבר" : "שלח קישור"}
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--link"
          onClick={() => { setMsg(null); setMode(mode === "login" ? "reset" : "login"); }}
        >
          {mode === "login" ? "שכחתי סיסמה" : "חזרה להתחברות"}
        </button>
      </form>
    </div>
  );
}