#!/usr/bin/env node
// Subset the self-hosted webfonts down to the characters this site actually
// renders, and write the result to public/fonts.
//
// The Latin faces are the heaviest thing on the critical path of a Hebrew
// site: on the home page the browser pulls roboto-latin (42.1KB) +
// assistant-latin (21.6KB) + assistant-latin-ext (10.9KB) — 74.6KB — against
// 7.1KB of actual Hebrew. They are full Google Fonts Latin cuts, carrying
// every accented glyph in the block, while the page uses little more than
// digits, ASCII and a handful of symbols.
//
// The originals live in fonts-src/ (not served) so this stays repeatable: if
// new copy introduces a character that was subset away, re-run this script and
// the glyph comes back from the full font.
//
// The weight axis is deliberately left intact. These are variable fonts and
// the CSS references the whole 100-900 range; pinning it to 400-700 would save
// another ~7KB but silently shift the weight of anything outside that range.
//
// Run: node scripts/subset-fonts.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import subsetFont from "subset-font";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "fonts-src");
const OUT = path.join(root, "public/fonts");

// Hebrew and everything above it is served by the -hebrew cut, which we keep
// whole: it is already small and Hebrew is the site's actual content.
const HEBREW_START = 0x0590;

// Always keep these, whether or not today's copy happens to use them, so that
// ordinary edits (a price, a bullet, an em dash) never fall back mid-sentence.
const ALWAYS =
  " !\"#$%&'()*+,-./0123456789:;<=>?@" +
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`" +
  "abcdefghijklmnopqrstuvwxyz{|}~" +
  " «»§©®°·×" +
  "–—‘’“”•…₪€™";

function collectSiteText() {
  let text = "";
  const strip = (s) => s.replace(/<[^>]*>/g, " ");

  for (const name of ["main.html", "header.html", "footer.html"]) {
    text += strip(fs.readFileSync(path.join(root, "src/generated", name), "utf8"));
  }

  const contentDir = path.join(root, "public/content");
  for (const name of fs.readdirSync(contentDir)) {
    if (!name.endsWith(".json")) continue;
    const json = JSON.parse(fs.readFileSync(path.join(contentDir, name), "utf8"));
    for (const value of Object.values(json)) {
      if (typeof value === "string") text += strip(value);
    }
  }

  // Copy authored in components (labels, error messages, the calculator).
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "generated") walk(p);
      } else if (/\.(tsx?|css)$/.test(entry.name)) {
        text += fs.readFileSync(p, "utf8");
      }
    }
  };
  walk(path.join(root, "src"));

  return text;
}

const used = new Set(ALWAYS);
for (const ch of collectSiteText()) {
  if (ch.codePointAt(0) < HEBREW_START) used.add(ch);
}
const charset = [...used].sort((a, b) => a.codePointAt(0) - b.codePointAt(0)).join("");

const kb = (n) => (n / 1024).toFixed(1) + "KB";
let before = 0;
let after = 0;

for (const name of fs.readdirSync(SRC).sort()) {
  if (!name.endsWith(".woff2")) continue;
  const src = fs.readFileSync(path.join(SRC, name));
  // The Hebrew cut is the content font — ship it whole.
  const out = name.includes("hebrew")
    ? src
    : await subsetFont(src, charset, { targetFormat: "woff2" });
  fs.writeFileSync(path.join(OUT, name), out);
  before += src.length;
  after += out.length;
  console.log(`  ${name.padEnd(26)} ${kb(src.length).padStart(8)} -> ${kb(out.length)}`);
}

console.log(
  `subset-fonts: ${charset.length} glyphs kept | ${kb(before)} -> ${kb(after)} (-${kb(
    before - after,
  )})`,
);
