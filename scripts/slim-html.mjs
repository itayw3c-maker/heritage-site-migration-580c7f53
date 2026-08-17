#!/usr/bin/env node
// Strip Elementor bookkeeping attributes that nothing in this port reads.
//
// The WordPress export carries every attribute Elementor's own editor and
// runtime needed. We ship neither, so most of them are inert bytes that still
// have to travel over the wire and be parsed into the DOM on every page view.
// Across src/generated/*.html plus the 176 per-page files in public/content,
// data-* attributes account for ~226KB of raw markup.
//
// Every attribute below was verified to have zero readers — no getAttribute /
// querySelector in src/**, and no attribute selector in src/styles.css or
// public/assets/elementor-heavy.css. Attributes that ARE read stay put:
//   data-settings, data-lazy-src/srcset/sizes, data-thumbnail, data-width,
//   data-height, data-wpr-lazyrender, data-cfemail, data-elementor-type and
//   data-elementor-id (CSS selectors), data-element_type="column" (CSS), and
//   data-id on .rll-youtube-player / the one hard-coded #92ba2bb selector.
//
// Run: node scripts/slim-html.mjs  (idempotent; re-run after re-exporting WP)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Dropped wholesale.
const DROP = [
  // Elementor's encoded lightbox/popup payload. Kept only as a thumbnail
  // fallback in elementor-enhance.ts, for anchors with no usable href — and
  // all 146 of them do have one, so the fallback is unreachable.
  "data-e-action-hash",
  // Editor bookkeeping.
  "data-widget_type",
  "data-e-type",
  "data-imgurl",
  "data-elementor-post-type",
  "data-container",
  "data-empty",
  "data-custom-edit-handle",
  "data-collapse-text",
  "data-open-text",
  // Lightbox wiring for a lightbox that does not exist here: there is no
  // Elementor runtime, so these anchors already behave as plain image links.
  "data-elementor-lightbox-title",
  "data-elementor-lightbox-description",
  "data-elementor-lightbox-slideshow",
  "data-elementor-open-lightbox",
];

// data-id survives only on the YouTube facade and the one element addressed by
// a hard-coded selector in SingleTemplate.tsx.
const KEEP_DATA_ID_VALUES = new Set(["92ba2bb"]);

function slimTag(tag) {
  let out = tag;
  for (const attr of DROP) {
    out = out.replace(new RegExp(`\\s${attr}="[^"]*"`, "g"), "");
  }
  // Only [data-element_type="column"] is targeted by CSS; the other 849
  // (container / widget / section) are inert.
  out = out.replace(/\sdata-element_type="(?!column")[^"]*"/g, "");
  if (!/rll-youtube-player/.test(out)) {
    out = out.replace(/\sdata-id="([^"]*)"/g, (m, v) =>
      KEEP_DATA_ID_VALUES.has(v) ? m : "",
    );
  }
  return out;
}

function slimHtml(html) {
  return html.replace(/<[a-zA-Z][^>]*>/g, slimTag);
}

const kb = (n) => (n / 1024).toFixed(1) + "KB";
let before = 0;
let after = 0;

for (const name of ["main.html", "header.html", "footer.html"]) {
  const file = path.join(root, "src/generated", name);
  const src = fs.readFileSync(file, "utf8");
  const out = slimHtml(src);
  before += src.length;
  after += out.length;
  if (out !== src) fs.writeFileSync(file, out);
}

const contentDir = path.join(root, "public/content");
for (const name of fs.readdirSync(contentDir)) {
  if (!name.endsWith(".json")) continue;
  const file = path.join(contentDir, name);
  const raw = fs.readFileSync(file, "utf8");
  const json = JSON.parse(raw);
  let touched = false;
  for (const key of Object.keys(json)) {
    const v = json[key];
    if (typeof v !== "string" || !v.includes("<")) continue;
    const out = slimHtml(v);
    if (out !== v) {
      json[key] = out;
      touched = true;
    }
  }
  before += raw.length;
  if (touched) {
    const next = JSON.stringify(json);
    fs.writeFileSync(file, next);
    after += next.length;
  } else {
    after += raw.length;
  }
}

console.log(
  `slim-html: ${kb(before)} -> ${kb(after)} (-${kb(before - after)}, ${(
    ((before - after) / before) *
    100
  ).toFixed(1)}%)`,
);
