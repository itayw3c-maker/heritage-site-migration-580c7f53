import { createFileRoute, Outlet, Link, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ניהול | רפאל שמאות" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  beforeLoad: async ({ location }) => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      if (location.pathname !== "/admin/login") {
        throw redirect({ to: "/admin/login" });
      }
      return;
    }
    const { data: isAdminData } = await (supabase as any).rpc("is_admin");
    if (!isAdminData) {
      await supabase.auth.signOut();
      if (location.pathname !== "/admin/login") {
        throw redirect({ to: "/admin/login" });
      }
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const isLogin = router.state.location.pathname === "/admin/login" || router.state.location.pathname === "/admin/login/";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, [router.state.location.pathname]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/admin/login" });
  }

  if (isLogin) {
    return (
      <div dir="rtl" className="admin-shell admin-shell--auth">
        <Outlet />
      </div>
    );
  }

  return (
    <div dir="rtl" className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-topbar__inner">
          <Link to="/admin/posts" className="admin-topbar__brand">ניהול תוכן</Link>
          <nav className="admin-topbar__nav">
            <Link to="/admin/posts" className="admin-topbar__link" activeProps={{ className: "admin-topbar__link admin-topbar__link--active" }}>רשומות</Link>
          </nav>
          <div className="admin-topbar__user">
            {email ? <span className="admin-topbar__email">{email}</span> : null}
            <button type="button" onClick={handleSignOut} className="admin-btn admin-btn--ghost">התנתק</button>
          </div>
        </div>
      </header>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}