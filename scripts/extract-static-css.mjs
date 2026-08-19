// Extract the per-page CSS that `static` content records carry inline.
//
// Why: the 18 `static` records (about, צור-קשר, שאלות-תשובות, גלריה, …) each
// embed up to 272KB of page-scoped CSS in a `styles_css` field. Because that
// blob would be serialised twice on an SSR pass (once in the rendered <style>,
// once in the router's loader payload), getContentRecord used to skip these
// records entirely — which pushed the whole page body to a post-hydration
// fetch and left them with no SSR content at all.
//
// This script writes each record's styles_css to public/content-css/<key>.css
// at prebuild time, so the server can SSR the markup and reference the CSS
// with a plain <link> instead of shipping it through JS.
//
// The source JSON files are NOT modified; the runtime strips styles_css when
// a matching extracted file exists (see src/lib/content-record.functions.ts).
import fs from "node:fs";
import path from "node:path";

const CONTENT_DIR = "public/content";
const OUT_DIR = "public/content-css";

/** Slug -> filesystem-safe key. Mirrors cssKeyForSlug() in src/lib/static-css.ts. */
function cssKey(slug) {
  return slug.replace(/\//g, "__");
}

function walk(dir, base = "") {
  const out = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      out.push(...walk(full, base ? `${base}/${entry}` : entry));
      continue;
    }
    if (!entry.endsWith(".json")) continue;
    if (entry === "_indexes.json") continue;
    const slug = (base ? `${base}/` : "") + entry.replace(/\.json$/, "");
    out.push({ full, slug });
  }
  return out;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

// Drop stale files so a renamed/removed page does not leave an orphan behind.
for (const f of fs.readdirSync(OUT_DIR)) {
  if (f.endsWith(".css")) fs.unlinkSync(path.join(OUT_DIR, f));
}

let count = 0;
let bytes = 0;
const manifest = {};

for (const { full, slug } of walk(CONTENT_DIR)) {
  let record;
  try {
    record = JSON.parse(fs.readFileSync(full, "utf8"));
  } catch {
    continue;
  }
  if (record.type !== "static" || !record.styles_css) continue;

  const key = cssKey(slug);
  const outFile = path.join(OUT_DIR, `${key}.css`);
  fs.writeFileSync(outFile, record.styles_css, "utf8");
  manifest[slug] = `/content-css/${encodeURIComponent(key)}.css`;
  count += 1;
  bytes += Buffer.byteLength(record.styles_css, "utf8");
}

fs.writeFileSync(
  path.join(OUT_DIR, "manifest.json"),
  JSON.stringify(manifest, null, 2),
  "utf8",
);

console.log(
  `[extract-static-css] ${count} static pages, ${(bytes / 1024).toFixed(0)}KB of CSS moved out of the JS payload`,
);
