import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import mainHtml from "@/generated/main.html?raw";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  useEffect(() => {
    document.title = "רפאל שמאות רכוש | RR - ניהול תביעות ביטוח, הערכת נזקים";
    let metaEl = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!metaEl) {
      metaEl = document.createElement("meta");
      metaEl.name = "description";
      document.head.appendChild(metaEl);
    }
    metaEl.content =
      "רפאל שמאות רכוש - שמאי רכוש פרטי לניהול תביעות ביטוח, הערכת נזקים, ייעוץ וליווי מול חברות הביטוח.";
    // Elementor's lazy-load background rules hide backgrounds until JS adds
    // the `e-lazyloaded` class. We're not shipping that JS — flip them all on.
    document.querySelectorAll(".e-con.e-parent").forEach((el) => {
      el.classList.add("e-lazyloaded");
    });
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: mainHtml }} />;
}
