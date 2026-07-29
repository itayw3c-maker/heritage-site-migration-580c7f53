import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AccessibilityWidget } from "@/components/AccessibilityWidget";
import { CookieBanner } from "@/components/CookieBanner";
import { enhanceElementor } from "@/lib/elementor-enhance";
import { hydrateFixDigital } from "@/lib/fixdigital";
import { rememberPasswordRecovery } from "@/lib/password-recovery-flag";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    __rrPasswordRecoveryListenerAttached?: boolean;
  }
}

if (typeof window !== "undefined" && !window.__rrPasswordRecoveryListenerAttached) {
  window.__rrPasswordRecoveryListenerAttached = true;
  supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") rememberPasswordRecovery();
  });
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "רפאל שמאות רכוש | RR - ניהול תביעות ביטוח, הערכת נזקים" },
      {
        name: "description",
        content:
          "רפאל שמאות רכוש - שמאי רכוש פרטי לניהול תביעות ביטוח, הערכת נזקים, ייעוץ וליווי מול חברות הביטוח.",
      },
      { property: "og:title", content: "רפאל שמאות רכוש | RR - ניהול תביעות ביטוח, הערכת נזקים" },
      {
        property: "og:description",
        content: "רפאל שמאות רכוש - שמאי רכוש פרטי לניהול תביעות ביטוח, הערכת נזקים, ייעוץ וליווי מול חברות הביטוח.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "רפאל שמאות רכוש | RR - ניהול תביעות ביטוח, הערכת נזקים" },
      { name: "twitter:description", content: "רפאל שמאות רכוש - שמאי רכוש פרטי לניהול תביעות ביטוח, הערכת נזקים, ייעוץ וליווי מול חברות הביטוח." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5ba5d480-540a-4f8e-bfed-b9e8d2e477e5/id-preview-20c9329e--84e35538-730b-4b9b-bb23-6c04421a2835.lovable.app-1785073621529.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5ba5d480-540a-4f8e-bfed-b9e8d2e477e5/id-preview-20c9329e--84e35538-730b-4b9b-bb23-6c04421a2835.lovable.app-1785073621529.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/wp-content/uploads/2024/04/Vector-2-150x150.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/wp-content/uploads/2024/04/Vector-2.png" },
      { rel: "apple-touch-icon", href: "/wp-content/uploads/2024/04/Vector-2.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Assistant:wght@200..800&family=Roboto:wght@100..900&family=Roboto+Slab:wght@100..900&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="he-IL" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body className="rtl home wp-singular page-template page-template-elementor_header_footer page page-id-57 wp-custom-logo wp-embed-responsive wp-theme-hello-elementor eio-default manage-default ally-default esm-default hello-elementor-default elementor-default elementor-template-full-width elementor-kit-7 elementor-page elementor-page-57">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  useEffect(() => {
    if (isAdmin) return;
    const run = () => enhanceElementor(document);
    run();
    const t = window.setTimeout(run, 50);
    return () => window.clearTimeout(t);
  });

  return (
    <QueryClientProvider client={queryClient}>
      {!isAdmin && <SiteHeader />}
      <div id="main-content" tabIndex={-1}>
        <Outlet />
      </div>
      {!isAdmin && <SiteFooter />}
      {!isAdmin && <AccessibilityWidget />}
      {!isAdmin && <CookieBanner />}
    </QueryClientProvider>
  );
}
