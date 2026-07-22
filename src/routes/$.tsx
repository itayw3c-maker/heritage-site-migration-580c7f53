import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SingleTemplate, type SingleRecord } from "@/components/SingleTemplate";

export const Route = createFileRoute("/$")({
  component: PlaceholderPage,
});

function PlaceholderPage() {
  const { _splat } = Route.useParams();
  const slug = decodeURIComponent(_splat ?? "").replace(/^\/+|\/+$/g, "");
  const path = "/" + slug;
  const [record, setRecord] = useState<SingleRecord | null>(null);
  const [status, setStatus] = useState<"loading" | "found" | "missing">("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setRecord(null);
    fetch(`/content/${slug}.json`, { headers: { accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
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
    return <SingleTemplate record={record} />;
  }

  if (status === "loading") {
    return <div style={{ minHeight: "60vh" }} />;
  }

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "4rem 1rem",
        textAlign: "center",
        fontFamily: "Assistant, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>העמוד בבנייה</h1>
      <p style={{ color: "#7A7A7A", direction: "ltr" }}>{path}</p>
    </div>
  );
}