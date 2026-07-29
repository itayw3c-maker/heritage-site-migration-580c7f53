import { createServerFn } from "@tanstack/react-start";
import slugsJson from "@/generated/content-slugs.json";

const SLUGS: ReadonlySet<string> = new Set(slugsJson as string[]);

// Archive/list paths that /$ never receives (they match dedicated routes)
// but which we still want to treat as existing for defensive callers.
const ARCHIVE_PREFIXES = ["success", "shorts", "category/"];

function pathExistsSync(path: string): boolean {
  const clean = (path || "").replace(/^\/+|\/+$/g, "");
  if (!clean) return true;
  if (SLUGS.has(clean)) return true;
  if (clean === "success" || clean === "shorts") return true;
  for (const p of ARCHIVE_PREFIXES) {
    if (clean.startsWith(p)) return true;
  }
  return false;
}

export const checkContentPath = createServerFn({ method: "GET" })
  .inputValidator((d: { path: string }) => ({ path: String(d?.path ?? "") }))
  .handler(async ({ data }) => pathExistsSync(data.path));