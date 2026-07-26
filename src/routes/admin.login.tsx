import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const [mode, setMode] = useState<"login" | "reset" | "signup" | "update">("login");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash || "";
      if (hash.includes("type=recovery")) {
        setPassword("");
        setPasswordConfirm("");
        setMode("update");
      }
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setPassword("");
        setPasswordConfirm("");
        setMsg(null);
        setMode("update");
      }
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

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

  async function handleUpdate(e: React.FormEvent) {
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
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      const raw = (error.message || "").toLowerCase();
      let text = "עדכון הסיסמה נכשל";
      if (raw.includes("password")) text = "הסיסמה חלשה מדי";
      else if (raw.includes("session") || raw.includes("auth")) text = "פג תוקף הקישור. נא לבקש קישור חדש";
      setMsg({ kind: "err", text });
      return;
    }
    if (typeof window !== "undefined" && window.location.hash) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    setMsg({ kind: "ok", text: "הסיסמה עודכנה בהצלחה" });
    router.navigate({ to: "/admin/posts" });
  }

  const submitHandler =
    mode === "login"
      ? handleLogin
      : mode === "reset"
        ? handleReset
        : mode === "signup"
          ? handleSignup
          : handleUpdate;

  const title =
    mode === "login"
      ? "התחברות למערכת"
      : mode === "reset"
        ? "איפוס סיסמה"
        : mode === "signup"
          ? "הרשמה למערכת"
          : "הגדרת סיסמה חדשה";

  const submitLabel =
    mode === "login"
      ? "התחבר"
      : mode === "reset"
        ? "שלח קישור"
        : mode === "signup"
          ? "הרשמה"
          : "שמור סיסמה";

  return (
    <div className="admin-login">
      <form className="admin-card admin-login__form" onSubmit={submitHandler}>
        <h1 className="admin-login__title">{title}</h1>
        {mode !== "update" && (
          <label className="admin-field">
            <span>אימייל</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </label>
        )}
        {(mode === "login" || mode === "signup" || mode === "update") && (
          <label className="admin-field">
            <span>{mode === "update" ? "סיסמה חדשה" : "סיסמה"}</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
        )}
        {(mode === "signup" || mode === "update") && (
          <label className="admin-field">
            <span>{mode === "update" ? "אימות סיסמה חדשה" : "אימות סיסמה"}</span>
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