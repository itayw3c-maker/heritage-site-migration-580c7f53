import { createServerFn } from "@tanstack/react-start";
import type { SingleRecord } from "@/components/SingleTemplate";
import type { RelatedHtml } from "./related-posts";

// Server-side read of public/content/<slug>.json so template-driven pages are
// part of the SSR HTML (previously they were fetched after hydration, which
// cost a full-page layout shift plus a late LCP).
// `static` records are intentionally skipped: they carry up to ~300KB of
// page-scoped CSS and would be serialized twice (rendered + loader payload).
export const getContentRecord = createServerFn({ method: "GET" })
  .inputValidator((d: { path: string }) => ({ path: String(d?.path ?? "") }))
  .handler(
    async ({
      data,
    }): Promise<{ record: SingleRecord | null; related: RelatedHtml }> => {
      const empty = { record: null, related: { w1: "", w2: "" } };
      if (!data.path) return empty;
      const { loadContentRecord, loadRelated } = await import("./content-record.server");
      const record = await loadContentRecord<SingleRecord>(data.path);
      if (!record || !record.type || record.type === "static") return empty;
      const related =
        record.type === "post" ? await loadRelated(data.path) : { w1: "", w2: "" };
      return { record, related };
    },
  );
