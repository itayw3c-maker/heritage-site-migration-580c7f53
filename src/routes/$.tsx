import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SingleTemplate, type SingleRecord } from "@/components/SingleTemplate";
import { getSeoRecord } from "@/lib/seo.functions";
import { getSeoOverride, isExpertReviewedPath } from "@/lib/seo-overrides";
import {
  augmentShortSeo,
  augmentSuccessSeo,
  augmentVideoSeo,
  augmentExpertSeo,
  buildSeoHead,
  correctArticleWordCount,
  overrideSeoIdentity,
} from "@/lib/seo-head";
import { checkContentPath } from "@/lib/content-existence.functions";
import { getContentRecord } from "@/lib/content-record.functions";

export const Route = createFileRoute("/$")({
  loader: async ({ params }) => {
    const raw = (params as { _splat?: string })._splat ?? "";
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      /* keep raw */
    }
    const path = decoded.replace(/^\/+|\/+$/g, "");
    const rafaelPath = "about/השמאי-רפאל-ריבוח-מייסד-ובעלים";
    const duplicateRafaelPath = `${rafaelPath}-2`;
    const kobiPath = "about/עורך-דין-קובי-ליבוביץ";
    if (path === duplicateRafaelPath) {
      throw redirect({
        href: "/about/%D7%94%D7%A9%D7%9E%D7%90%D7%99-%D7%A8%D7%A4%D7%90%D7%9C-%D7%A8%D7%99%D7%91%D7%95%D7%97-%D7%9E%D7%99%D7%99%D7%A1%D7%93-%D7%95%D7%91%D7%A2%D7%9C%D7%99%D7%9D/",
        statusCode: 301,
      } as unknown as Parameters<typeof redirect>[0]);
    }
    if (!path || path.startsWith("admin"))
      return { seo: null, record: null, related: { w1: "", w2: "" } };
    // The WordPress export assigned the canonical Rafael slug to Kobi's
    // profile and put Rafael under a `-2` duplicate. Preserve both entities:
    // Rafael owns the established canonical URL; Kobi gets a descriptive URL.
    const lookupPath = path === rafaelPath ? duplicateRafaelPath : path === kobiPath ? rafaelPath : path;
    const [seo, exists, content] = await Promise.all([
      getSeoRecord({ data: { path: lookupPath } }),
      checkContentPath({ data: { path: lookupPath } }),
      getContentRecord({ data: { path: lookupPath } }),
    ]);
    if (!exists && !content.record) {
      // Throwing notFound() lets TanStack set the HTTP 404 status during SSR
      // and render the route's notFoundComponent below.
      throw notFound();
    }
    let pageSeo = correctArticleWordCount(content.dbSeo ?? seo, content.record ?? {});
    const seoOverride = getSeoOverride(path);
    pageSeo = overrideSeoIdentity(pageSeo, {
      canonical: path === kobiPath ? `https://www.rrshamaut.co.il/${encodeURI(kobiPath)}/` : undefined,
      title: seoOverride?.title,
      description: seoOverride?.description,
    });
    const typedSeo =
      content.record?.type === "movie"
        ? augmentVideoSeo(pageSeo, content.record)
        : content.record?.type === "shorts"
          ? augmentShortSeo(pageSeo, content.record)
          : content.record?.type === "success"
            ? augmentSuccessSeo(pageSeo, content.record)
            : pageSeo;
    return {
      seo: augmentExpertSeo(typedSeo, { reviewed: isExpertReviewedPath(path), path }),
      record: content.record,
      related: content.related,
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "404 - העמוד לא נמצא | רפאל שמאות רכוש" },
          { name: "robots", content: "noindex, nofollow" },
        ],
      };
    }
    return buildSeoHead(loaderData.seo);
  },
  component: PlaceholderPage,
  notFoundComponent: NotFoundRoute,
});

function NotFoundRoute() {
  return <NotFound404 />;
}

function PlaceholderPage() {
  const { _splat } = Route.useParams();
  const { record: ssrRecord, related: ssrRelated, seo } = Route.useLoaderData();
  const slug = decodeURIComponent(_splat ?? "").replace(/^\/+|\/+$/g, "");
  const [record, setRecord] = useState<SingleRecord | null>(null);
  const [status, setStatus] = useState<"loading" | "found" | "missing">("loading");

  useEffect(() => {
    // SSR already delivered the record for template-driven pages.
    if (ssrRecord) return;
    let cancelled = false;
    setStatus("loading");
    setRecord(null);
    fetch(`/content/${slug}.json`)
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        const ct = r.headers.get("content-type") ?? "";
        if (!ct.includes("json")) throw new Error("not-json");
        return r.json();
      })
      .then((data: SingleRecord) => {
        if (cancelled) return;
        setRecord(data);
        setStatus("found");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [slug, ssrRecord]);

  if (ssrRecord) {
    return <SingleTemplate record={ssrRecord} slug={slug} related={ssrRelated} />;
  }

  if (status === "found" && record) {
    return <SingleTemplate record={record} slug={slug} />;
  }

  if (status === "loading") {
    // Static pages (about/jobs/team) are skipped by the SSR content loader to
    // keep their ~300KB records out of the HTML, so their body renders
    // client-side. Emit an SSR H1 + intro from the SEO record so the initial
    // HTML carries the page's topic and a real <h1> for crawlers.
    const ssrTitle = seo?.og?.og_title;
    const ssrDesc = seo?.og?.og_description;
    return (
      <div style={{ minHeight: "60vh" }}>
        {ssrTitle ? <h1 className="rr-sr-only">{ssrTitle}</h1> : null}
        {ssrDesc ? <p className="rr-sr-only">{ssrDesc}</p> : null}
      </div>
    );
  }

  return <NotFound404 />;
}

function NotFound404() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "404 - העמוד לא נמצא | רפאל שמאות רכוש";
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    let created = false;
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
      created = true;
    }
    const prevRobots = robots.content;
    robots.content = "noindex, nofollow";
    return () => {
      document.title = prevTitle;
      if (created) robots?.remove();
      else if (robots) robots.content = prevRobots;
    };
  }, []);

  const linkStyle: React.CSSProperties = {
    color: "#056FC4",
    textDecoration: "none",
    fontWeight: 600,
    padding: "0.5rem 0.75rem",
    borderRadius: "0.375rem",
    background: "#f5f8fb",
  };

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "4rem 1.5rem",
        textAlign: "center",
        fontFamily: "Assistant, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: "clamp(6rem, 20vw, 10rem)",
          lineHeight: 1,
          color: "#CBA436",
          fontWeight: 800,
          letterSpacing: "0.05em",
        }}
      >
        404
      </div>
      <h1
        style={{
          fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)",
          color: "#056FC4",
          margin: "1rem 0 0.5rem",
          fontWeight: 700,
        }}
      >
        העמוד שחיפשתם לא נמצא
      </h1>
      <p style={{ color: "#555", maxWidth: 520, margin: "0 0 2rem", fontSize: "1.05rem" }}>
        ייתכן שהקישור השתנה או שהעמוד הוסר. אפשר לחזור לדף הבית או ליצור איתנו קשר.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
        <a
          href="/"
          style={{
            background: "#CBA436",
            color: "#fff",
            padding: "0.75rem 1.75rem",
            borderRadius: "0.375rem",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: "1rem",
          }}
        >
          לדף הבית
        </a>
        <a
          href="/צור-קשר/"
          style={{
            background: "#056FC4",
            color: "#fff",
            padding: "0.75rem 1.75rem",
            borderRadius: "0.375rem",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: "1rem",
          }}
        >
          צרו קשר
        </a>
      </div>
      <div
        style={{
          marginTop: "3rem",
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: 720,
        }}
      >
        <a href="/מפת-אתר/" style={linkStyle}>השירותים שלנו</a>
        <a href="/category/מידע-מקצועי/" style={linkStyle}>מאמרים</a>
        <a href="/ההצלחות-שלנו/" style={linkStyle}>ההצלחות שלנו</a>
        <a href="/שאלות-תשובות/" style={linkStyle}>שאלות תשובות</a>
      </div>
    </div>
  );
}
