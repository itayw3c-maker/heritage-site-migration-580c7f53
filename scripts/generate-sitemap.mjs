#!/usr/bin/env node
// Build-time sitemap generator. Reads public/content/**/*.json and writes public/sitemap.xml.
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { buildModMap } from "./sitemap-lastmod.mjs";

const SITE = "https://www.rrshamaut.co.il";
const CONTENT_DIR = "public/content";
const OUT = "public/sitemap.xml";
const SLUGS_OUT = "src/generated/content-slugs.json";
const EXCLUDE_SLUGS = new Set([
  "thank-you",
  "about/השמאי-רפאל-ריבוח-מייסד-ובעלים-2",
]);
const VIRTUAL_SLUGS = ["about/עורך-דין-קובי-ליבוביץ"];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".json") && name !== "_indexes.json") out.push(p);
  }
  return out;
}

function slugFromPath(p) {
  const rel = relative(CONTENT_DIR, p).replace(/\\/g, "/");
  return rel.replace(/\.json$/, "");
}

function encodeSlug(slug) {
  return slug.split("/").map(encodeURIComponent).join("/");
}

const idx = JSON.parse(readFileSync(join(CONTENT_DIR, "_indexes.json"), "utf8"));
// Bundle public archive data for SSR without an internal HTTP request.
writeFileSync("src/generated/archive-index.json", JSON.stringify(idx));
const modMap = buildModMap(idx);

const urls = [];
urls.push({ loc: `${SITE}/` });

const allSlugs = [];
for (const file of walk(CONTENT_DIR)) {
  const slug = slugFromPath(file);
  allSlugs.push(slug);
  if (EXCLUDE_SLUGS.has(slug)) continue;
  const lastmod = modMap.get(slug);
  urls.push({ loc: `${SITE}/${encodeSlug(slug)}/`, lastmod });
}
for (const slug of VIRTUAL_SLUGS) {
  urls.push({ loc: `${SITE}/${encodeSlug(slug)}/`, lastmod: undefined });
}
writeFileSync(SLUGS_OUT, JSON.stringify(allSlugs.sort()));
console.log(`Wrote ${SLUGS_OUT} with ${allSlugs.length} slugs`);

// Archives (page 1 only)
for (const category of Object.values(idx.categories ?? {})) {
  let slug = category.slug;
  try { slug = decodeURIComponent(slug); } catch { /* keep raw */ }
  urls.push({ loc: `${SITE}/category/${encodeURIComponent(slug)}/` });
}
urls.push({ loc: `${SITE}/shorts/`, lastmod: undefined });
urls.push({ loc: `${SITE}/success/`, lastmod: undefined });

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  [...new Map(urls.map((url) => [url.loc, url])).values()]
    .map(
      (u) =>
        `  <url>\n    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}\n  </url>`,
    )
    .join("\n") +
  `\n</urlset>\n`;

writeFileSync(OUT, xml);
console.log(`Wrote ${OUT} with ${urls.length} URLs`);

const robots = `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\nSitemap: ${SITE}/blog-sitemap.xml\n`;
writeFileSync("public/robots.txt", robots);
console.log("Wrote public/robots.txt");

