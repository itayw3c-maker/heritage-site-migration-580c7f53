import { createFileRoute, Outlet, Link, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";

// Imported dynamically: a static import here lands in the critical (non-split)
// part of the route module and drags the Supabase auth client into the entry chunk.
const loadSupabase = () => import("@/integrations/supabase/client").then((m) => m.supabase);

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ניהול | רפאל שמאות" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  beforeLoad: async ({ location }) => {
    const path = location.pathname.replace(/\/+$/, "");
    const isLoginPath = path === "/admin/login";
    const supabase = await loadSupabase();
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      if (!isLoginPath) {
        throw redirect({ to: "/admin/login" });
      }
      return;
    }
    const { data: isAdminData } = await (supabase as any).rpc("is_admin");
    if (!isAdminData) {
      await supabase.auth.signOut();
      if (!isLoginPath) {
        throw redirect({ to: "/admin/login" });
      }
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const path = router.state.location.pathname.replace(/\/+$/, "");
  const isLogin = path === "/admin/login";
  const isPreview = /^\/admin\/posts\/[^/]+\/preview\/?$/.test(router.state.location.pathname);

  useEffect(() => {
    loadSupabase().then((supabase) =>
      supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null)),
    );
  }, [router.state.location.pathname]);

  async function handleSignOut() {
    const supabase = await loadSupabase();
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

  if (isPreview) {
    return <Outlet />;
  }

  return (
    <div dir="rtl" className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-topbar__inner">
          <Link to="/admin/posts" className="admin-topbar__brand">ניהול תוכן</Link>
          <nav className="admin-topbar__nav">
            <Link to="/admin/posts" className="admin-topbar__link" activeProps={{ className: "admin-topbar__link admin-topbar__link--active" }}>רשומות</Link>
            <Link to="/admin/users" className="admin-topbar__link" activeProps={{ className: "admin-topbar__link admin-topbar__link--active" }}>משתמשים</Link>
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