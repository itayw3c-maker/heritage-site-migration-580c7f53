#!/usr/bin/env node
// Build-time generator: list of routes to prerender to static HTML.
// Mirrors scripts/generate-sitemap.mjs (same slug source, same encoding).
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const CONTENT_DIR = "public/content";
const OUT = "src/generated/prerender-paths.json";

const PAGE_SIZES = { category: 9, shorts: 6, success: 30 };

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".json") && name !== "_indexes.json") out.push(p);
  }
  return out;
}

function slugFromPath(p) {
  return relative(CONTENT_DIR, p).replace(/\\/g, "/").replace(/\.json$/, "");
}

function encodeSlug(slug) {
  return slug.split("/").map(encodeURIComponent).join("/");
}

function decodeSlug(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

const paths = ["/"];

for (const file of walk(CONTENT_DIR).sort()) {
  paths.push(`/${encodeSlug(slugFromPath(file))}/`);
}

// Archives (with real pagination)
const idx = JSON.parse(readFileSync(join(CONTENT_DIR, "_indexes.json"), "utf8"));

function archivePaths(base, count, size) {
  const total = Math.max(1, Math.ceil(count / size));
  const out = [`${base}/`];
  for (let n = 2; n <= total; n++) out.push(`${base}/page/${n}/`);
  return out;
}

for (const [id, cat] of Object.entries(idx.categories ?? {})) {
  const catNum = Number(id);
  const count = (idx.posts ?? []).filter((p) => p.categories?.includes(catNum)).length;
  if (!count) continue;
  const catSlug = decodeSlug(cat.slug);
  paths.push(...archivePaths(`/category/${encodeURIComponent(catSlug)}`, count, PAGE_SIZES.category));
}
paths.push(...archivePaths("/shorts", (idx.shorts ?? []).length, PAGE_SIZES.shorts));
paths.push(...archivePaths("/success", (idx.success ?? []).length, PAGE_SIZES.success));

const unique = Array.from(new Set(paths));
writeFileSync(OUT, JSON.stringify(unique, null, 0));
console.log(`Wrote ${OUT} with ${unique.length} paths`);
