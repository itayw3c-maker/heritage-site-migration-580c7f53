import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$")({
  component: PlaceholderPage,
});

function PlaceholderPage() {
  const { _splat } = Route.useParams();
  const path = "/" + decodeURIComponent(_splat ?? "");
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