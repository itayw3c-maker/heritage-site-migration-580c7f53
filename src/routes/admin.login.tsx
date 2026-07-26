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
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "reset" | "signup">("login");

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
    const { data: isAdminData } = await (supabase as any).rpc("is_admin");
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

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (password.length < 6) {
      setMsg({ kind: "err", text: "הסיסמה חייבת להכיל לפחות 6 תווים" });
      return;
    }
    if (password !== passwordConfirm) {
      setMsg({ kind: "err", text: "הסיסמאות אינן תואמות" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/admin/login`,
      },
    });
    setLoading(false);
    if (error) {
      const raw = (error.message || "").toLowerCase();
      let text = "ההרשמה נכשלה";
      if (raw.includes("already") || raw.includes("registered") || raw.includes("exists")) {
        text = "אימייל זה כבר רשום במערכת";
      } else if (raw.includes("password")) {
        text = "הסיסמה חלשה מדי";
      } else if (raw.includes("email")) {
        text = "כתובת האימייל אינה תקינה";
      }
      setMsg({ kind: "err", text });
      return;
    }
    setMsg({ kind: "ok", text: "נשלח אליך אימייל אימות. יש לאשר אותו לפני ההתחברות הראשונה." });
  }

  const submitHandler =
    mode === "login" ? handleLogin : mode === "reset" ? handleReset : handleSignup;

  const title =
    mode === "login" ? "התחברות למערכת" : mode === "reset" ? "איפוס סיסמה" : "הרשמה למערכת";

  const submitLabel =
    mode === "login" ? "התחבר" : mode === "reset" ? "שלח קישור" : "הרשמה";

  return (
    <div className="admin-login">
      <form className="admin-card admin-login__form" onSubmit={submitHandler}>
        <h1 className="admin-login__title">{title}</h1>
        <label className="admin-field">
          <span>אימייל</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </label>
        {(mode === "login" || mode === "signup") && (
          <label className="admin-field">
            <span>סיסמה</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
        )}
        {mode === "signup" && (
          <label className="admin-field">
            <span>אימות סיסמה</span>
            <input
              type="password"
              required
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </label>
        )}
        {msg && <div className={`admin-msg admin-msg--${msg.kind}`}>{msg.text}</div>}
        <button type="submit" className="admin-btn admin-btn--primary" disabled={loading}>
          {loading ? "רגע…" : submitLabel}
        </button>
        {mode === "login" && (
          <>
            <button
              type="button"
              className="admin-btn admin-btn--link"
              onClick={() => { setMsg(null); setMode("reset"); }}
            >
              שכחתי סיסמה
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--link"
              onClick={() => { setMsg(null); setPassword(""); setPasswordConfirm(""); setMode("signup"); }}
            >
              אין לך חשבון? הרשמה
            </button>
          </>
        )}
        {mode === "signup" && (
          <button
            type="button"
            className="admin-btn admin-btn--link"
            onClick={() => { setMsg(null); setPasswordConfirm(""); setMode("login"); }}
          >
            יש לך חשבון? התחברות
          </button>
        )}
        {mode === "reset" && (
          <button
            type="button"
            className="admin-btn admin-btn--link"
            onClick={() => { setMsg(null); setMode("login"); }}
          >
            חזרה להתחברות
          </button>
        )}
      </form>
    </div>
  );
}