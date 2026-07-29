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
import criticalCss from "@/generated/critical.css?inline";

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
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/wp-content/uploads/2024/04/Vector-2.png" },
      { rel: "apple-touch-icon", href: "/wp-content/uploads/2024/04/Vector-2.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      { rel: "preconnect", href: "https://lpc.fixdigital.co.il", crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://cdn.trustindex.io", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://lpc.fixdigital.co.il" },
      { rel: "dns-prefetch", href: "https://cdn.trustindex.io" },
      { rel: "dns-prefetch", href: "https://api.fixdigital.co.il" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ProfessionalService",
          name: "רפאל שמאות רכוש",
          legalName: "רפאל שמאות רכוש - שמאי רכוש",
          url: "https://www.rrshamaut.co.il/",
          logo: "https://www.rrshamaut.co.il/wp-content/uploads/2024/04/%D7%9C%D7%95%D7%92%D7%95.png",
          image: "https://www.rrshamaut.co.il/wp-content/uploads/2024/04/%D7%9C%D7%95%D7%92%D7%95.png",
          description:
            "משרד שמאי רכוש פרטי ובלתי תלוי המתמחה בהערכת נזקי רכוש וניהול תביעות ביטוח עבור לקוחות פרטיים ועסקיים, ייצוג מול חברות הביטוח.",
          telephone: "+972-77-805-1266",
          email: "office@rrshamaut.co.il",
          priceRange: "$$$",
          sameAs: [
            "https://www.facebook.com/rrshamaut/",
            "https://www.instagram.com/rrshamaut",
            "https://www.youtube.com/@rephael.shamaut-rr",
            "https://www.tiktok.com/@rephaelshamaut",
            "https://www.threads.com/@rrshamaut",
          ],
          address: {
            "@type": "PostalAddress",
            streetAddress: "הבנאים 5",
            addressLocality: "אשדוד",
            postalCode: "7760905",
            addressCountry: "IL",
          },
          geo: {
            "@type": "GeoCoordinates",
            latitude: 31.8153,
            longitude: 34.6593,
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "5",
            reviewCount: "520",
          },
          openingHoursSpecification: [
            {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
              opens: "07:00",
              closes: "21:00",
            },
            {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: "Friday",
              opens: "07:00",
              closes: "16:00",
            },
          ],
          keywords: [
            "שמאי רכוש פרטי",
            "הערכת נזקי רכוש",
            "שמאי נזקי אש",
            "שמאי נזקי מים",
            "שמאי נזקי טבע",
            "נזקי פריצה",
            "נזקי עבודות קבלניות",
            "ניהול תביעות ביטוח",
            "שמאי רכוש",
            "חוות דעת שמאי רכוש",
            "נזקי צנרת",
            "נזקי מים",
            "שמאי רכוש בלתי תלוי",
          ],
          areaServed: { "@type": "Country", name: "Israel" },
          contactPoint: {
            "@type": "ContactPoint",
            telephone: "+972-77-805-1266",
            contactType: "customer service",
            areaServed: "IL",
            availableLanguage: ["Hebrew", "English"],
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org/",
          "@type": "Product",
          name: "שירותי שמאות רכוש - רפאל RR",
          description:
            "שירותי שמאות רכוש מקצועיים ואמינים על ידי רפאל שמאות רכוש | RR. חוות דעת מומחה לבית משפט, נזקי מים, אש ופריצה.",
          brand: { "@type": "Brand", name: "רפאל שמאות רכוש | RR" },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "5.0",
            ratingCount: "520",
          },
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const googleFontsHref =
    "https://fonts.googleapis.com/css2?family=Assistant:wght@200..800&family=Roboto:wght@100..900&family=Roboto+Slab:wght@100..900&display=swap";
  const fixdigitalHead =
    "var fixdigital_params = { defaultphone:'', phoneSelector:'.fix_smartphone, .fix_smartphone1 , .fix_smartphone2', phoneSelectorHref:'.fix_smartphone_href, .fix_smartphone_href1 , .fix_smartphone_href2', api_type: 8, api_clientkey: '25634', api_projectid: '14114', api_projecttypeid: '4', sync:true, forms:[], cookie_expired:43200 };\n" +
    "!function(e){if(e.fixdigital=e.fixdigital||{},!e.fixdigital.cookie){e.fixdigital.cookie=e.fixdigital.cookie||{};var i,r=e.fixdigital.cookie;r.cookie_query=\"fixdigital.queryparams\",r.cookie_hash=\"fixdigital.hashparams\",r.cookie_referer=\"fixdigital.referer\",r.cookie_original_referer=\"fixdigital.origin_referer\",r.cookie_expired=10,r.cookie_original_expired=e.fixdigital_params.cookie_expired,r.crossdomain=(i=function(e){var i=e.split(\".\");\"www\"!==i[0]&&\"m\"!==i[0]&&\"mobile\"!==i[0]||i.shift();return i.join(\".\")}(location.hostname),\".\"+location.hostname.substring(location.hostname.indexOf(i))),r.getCookie=function(e){var i=document.cookie.match(new RegExp(\"(?:^|; )\"+e.replace(/([\\.$?*|{}\\(\\)\\[\\]\\\\\\/\\+^])/g,\"\\\\$1\")+\"=([^;]*)\"));return i?decodeURIComponent(i[1]):void 0},r.deleteCookie=function(e){for(var i=r.crossdomain.split(\".\");i&&0<i.length;){var o=i.join(\".\");r.setCookie(e,\"\",{expires:-1,domain:o,path:\"/\"}),i.shift()}},r.setCookie=function(e,i,o){var r=(o=o||{}).expires;if(\"number\"==typeof r&&r){var a=new Date;a.setTime(a.getTime()+1e3*r),r=o.expires=a}r&&r.toUTCString&&(o.expires=r.toUTCString());var t=e+\"=\"+(i=encodeURIComponent(i));for(var n in o){t+=\"; \"+n;var c=o[n];!0!==c&&(t+=\"=\"+c)}document.cookie=t},void 0===r.getCookie(r.cookie_referer)&&(r.setCookie(r.cookie_query,location.search,{expires:r.cookie_expired,domain:r.crossdomain}),r.setCookie(r.cookie_hash,location.hash,{expires:r.cookie_expired,domain:r.crossdomain}),r.setCookie(r.cookie_referer,document.referrer,{expires:r.cookie_expired,domain:r.crossdomain}))}}(window);";
  return (
    <html lang="he-IL" dir="rtl">
      <head>
        <HeadContent />
        {/* Critical CSS inlined — covers above-the-fold so full stylesheet
            can load non-blocking without FOUC. */}
        <style dangerouslySetInnerHTML={{ __html: criticalCss }} />
        {/* Full stylesheet — preload + swap so it doesn't block render. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var l=document.createElement('link');l.rel='preload';l.as='style';l.href=" +
              JSON.stringify(appCss) +
              ";l.onload=function(){this.onload=null;this.rel='stylesheet';};document.head.appendChild(l);})();",
          }}
        />
        <noscript>
          <link rel="stylesheet" href={appCss} />
        </noscript>
        {/* Google Fonts — non-blocking. Preload as style, then swap rel to
            stylesheet on load. display=swap in the URL guarantees no FOIT.
            <noscript> keeps it working with JS disabled. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var l=document.createElement('link');l.rel='preload';l.as='style';l.href=" +
              JSON.stringify(googleFontsHref) +
              ";l.onload=function(){this.onload=null;this.rel='stylesheet';};document.head.appendChild(l);})();",
          }}
        />
        <noscript>
          <link rel="stylesheet" href={googleFontsHref} />
        </noscript>
        <script dangerouslySetInnerHTML={{ __html: fixdigitalHead }} />
        {/* FixDigital integrate.js — MUST load in standard order
            (params → cookie IIFE → integrate.js), synchronously, so that
            api_projectid / api_projecttypeid are bound before add-view
            fires on DOMContentLoaded. Not async, not injected via effect. */}
        <script
          defer
          src="https://lpc.fixdigital.co.il/external_files/scripts/clp/fixdigital_integrate.js"
        />
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
    const run = () => {
      enhanceElementor(document);
      hydrateFixDigital();
    };
    run();
    const t = window.setTimeout(run, 50);
    const t2 = window.setTimeout(run, 500);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
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
