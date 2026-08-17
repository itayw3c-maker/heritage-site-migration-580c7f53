import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import mainHtml from "@/generated/main.html?raw";
import { getSeoRecord } from "@/lib/seo.functions";
import { buildSeoHead } from "@/lib/seo-head";
import { mountLiveGoogleReviews } from "@/lib/live-google-reviews";
import { improveMigratedHtml } from "@/lib/migrated-html";

const homepageCardImages = [
  { alt: "נזקי-אש (1)", src: "/assets/home-cards/fire-damage-448.webp", width: 448, height: 315 },
  { alt: "הערכת עתיקות שולחן וכיסא", src: "/assets/home-cards/antiques-355.webp", width: 355, height: 631 },
  { alt: "שמאי נזקי התנגשות", src: "/assets/home-cards/collision-448.webp", width: 448, height: 207 },
  {
    alt: "תמונתהמחשה לנזקי טבע ושטפונות",
    src: "/assets/home-cards/natural-disaster-355.webp",
    width: 355,
    height: 473,
  },
  { alt: "נזקי שוכרים", src: "/assets/home-cards/tenant-damage-355.webp", width: 355, height: 266 },
] as const;

function optimizeHomepageCardImages(html: string): string {
  return homepageCardImages.reduce((result, image) => {
    const escapedAlt = image.alt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const imagePattern = new RegExp(`<img\\b(?=[^>]*\\balt=["']${escapedAlt}["'])[^>]*>`, "i");
    return result.replace(imagePattern, (tag) =>
      tag
        .replace(/\bsrc=["'][^"']*["']/i, `src="${image.src}"`)
        .replace(/\bdata-lazy-src=["'][^"']*["']/i, `data-lazy-src="${image.src}"`)
        .replace(/\s+(?:data-lazy-)?srcset=["'][^"']*["']/gi, "")
        .replace(/\s+(?:data-lazy-)?sizes=["'][^"']*["']/gi, "")
        .replace(/\bwidth=["'][^"']*["']/i, `width="${image.width}"`)
        .replace(/\bheight=["'][^"']*["']/i, `height="${image.height}"`),
    );
  }, html);
}

// Lighthouse identifies this background as the homepage LCP element. Keeping
// the URL only behind an Elementor CSS variable delays discovery even with a
// preload hint, so expose the identical image directly in the SSR HTML.
const optimizedMainHtml = optimizeHomepageCardImages(improveMigratedHtml(mainHtml, "דף הבית של רפאל שמאות רכוש")
  .replace(
    'data-id="dabb116"',
    'data-id="dabb116" style="background-image:url(\'/wp-content/uploads/2025/12/bg_main.webp\')"',
  )
  // These below-the-fold cards used oversized legacy JPEGs. The equivalent
  // WebP files preserve their dimensions and appearance while cutting the
  // transferred image bytes, especially for the 1280×900 fire-damage card.
  .replaceAll(
    "/wp-content/uploads/elementor/thumbs/נזקי-אש-1-rmdcgmgj73nf9ua44y4v598m26881is5uyrn4b2ey0.jpg",
    "/wp-content/uploads/elementor/thumbs/נזקי-אש-1-rmdcgmgj73nf9ua44y4v598m26881is5uyrn4b2ey0.webp",
  )
  .replaceAll(
    "/wp-content/uploads/2026/04/תמונת-המחשה-לנזקי-טבע-ושטפונות_600x800.jpg",
    "/wp-content/uploads/2026/04/תמונת-המחשה-לנזקי-טבע-ושטפונות_600x800.webp",
  )
  .replaceAll(
    "/wp-content/uploads/2026/04/תמונת-המחשה-לנזקי-טבע-ושטפונות_600x800-225x300.jpg",
    "/wp-content/uploads/2026/04/תמונת-המחשה-לנזקי-טבע-ושטפונות_600x800-225x300.webp",
  )
  .replaceAll(
    "/wp-content/uploads/2026/04/שמאי-נזקי-התנגשות-2.jpg",
    "/wp-content/uploads/2026/04/שמאי-נזקי-התנגשות-2.webp",
  )
  .replaceAll(
    "/wp-content/uploads/2026/04/שמאי-נזקי-התנגשות-2-768x354.jpg",
    "/wp-content/uploads/2026/04/שמאי-נזקי-התנגשות-2-768x354.webp",
  )
  .replaceAll(
    "/wp-content/uploads/2026/04/שמאי-נזקי-התנגשות-2-300x138.jpg",
    "/wp-content/uploads/2026/04/שמאי-נזקי-התנגשות-2-300x138.webp",
  )
  .replaceAll(
    "/wp-content/uploads/2026/03/נזקי-עבודות-קבלן.jpg",
    "/wp-content/uploads/2026/03/נזקי-עבודות-קבלן.webp",
  )
  .replaceAll(
    "/wp-content/uploads/2026/03/נזקי-עבודות-קבלן-768x435.jpg",
    "/wp-content/uploads/2026/03/נזקי-עבודות-קבלן-768x435.webp",
  )
  .replaceAll(
    "/wp-content/uploads/2026/03/נזקי-עבודות-קבלן-300x170.jpg",
    "/wp-content/uploads/2026/03/נזקי-עבודות-קבלן-300x170.webp",
  ));

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
        // Actual LCP element: the hero section background-image.
        {
          rel: "preload",
          as: "image",
          href: "/wp-content/uploads/2025/12/bg_main.webp",
          fetchpriority: "high",
        },
      ],
    };
  },
  component: Index,
});

function Index() {
  useEffect(() => {
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

  return <div dangerouslySetInnerHTML={{ __html: optimizedMainHtml }} />;
}
