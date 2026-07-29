import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import mainHtml from "@/generated/main.html?raw";
import { getSeoRecord } from "@/lib/seo.functions";
import { buildSeoHead } from "@/lib/seo-head";
import { mountLiveGoogleReviews } from "@/lib/live-google-reviews";

export const Route = createFileRoute("/")({
  loader: async () => ({ seo: await getSeoRecord({ data: { path: "" } }) }),
  head: ({ loaderData }) => {
    const base = buildSeoHead(loaderData?.seo);
    return {
      ...base,
      links: [
        ...(base.links ?? []),
        // Preload the LCP hero so it starts fetching before the HTML body parses the <img>.
        {
          rel: "preload",
          as: "image",
          href: "/wp-content/uploads/2025/12/רפאל-שמאות-רכוש.webp",
          fetchpriority: "high",
        },
      ],
    };
  },
  component: Index,
});

function Index() {
  useEffect(() => {
    document.title = "שמאי רכוש רפאל ריבוח - הערכת נזקים מקצועית מול חברות הביטוח";
    let metaEl = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!metaEl) {
      metaEl = document.createElement("meta");
      metaEl.name = "description";
      document.head.appendChild(metaEl);
    }
    metaEl.content =
      'שמאי רכוש רפאל ריבוח המבין את עולם הביטוח מבפנים ובעל ניסיון בייצוג מבוטחים מול חברות הביטוח, הערכת נזק וחוות דעת לביה"מ לקבלת פיצוי הוגן.';
    // Elementor's lazy-load background rules hide backgrounds until JS adds
    // the `e-lazyloaded` class. We're not shipping that JS — flip them all on.
    document.querySelectorAll(".e-con.e-parent").forEach((el) => {
      el.classList.add("e-lazyloaded");
    });
    // Live Google reviews (with graceful fallback to static widget)
    const t1 = window.setTimeout(() => mountLiveGoogleReviews(document), 300);
    const t2 = window.setTimeout(() => mountLiveGoogleReviews(document), 1500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: mainHtml }} />;
}
