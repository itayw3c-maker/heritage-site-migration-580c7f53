import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SingleTemplate, type SingleRecord } from "@/components/SingleTemplate";
import { getSeoRecord } from "@/lib/seo.functions";
import { buildSeoHead } from "@/lib/seo-head";
import { checkContentPath } from "@/lib/content-existence.functions";

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
    if (!path || path.startsWith("admin")) return { seo: null };
    const [seo, exists] = await Promise.all([
      getSeoRecord({ data: { path } }),
      checkContentPath({ data: { path } }),
    ]);
    if (!exists) {
      // Throwing notFound() lets TanStack set the HTTP 404 status during SSR
      // and render the route's notFoundComponent below.
      throw notFound();
    }
    return { seo };
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
  const slug = decodeURIComponent(_splat ?? "").replace(/^\/+|\/+$/g, "");
  const [record, setRecord] = useState<SingleRecord | null>(null);
  const [status, setStatus] = useState<"loading" | "found" | "missing">("loading");

  useEffect(() => {
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
  }, [slug]);

  if (status === "found" && record) {
    return <SingleTemplate record={record} slug={slug} />;
  }

  if (status === "loading") {
    return <div style={{ minHeight: "60vh" }} />;
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