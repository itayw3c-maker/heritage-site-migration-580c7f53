#!/usr/bin/env node
// Purge unused CSS from src/styles/original.css and src/styles/rocket-pairs.css.
// Scans generated HTML, JSON content and React sources for used classes.

import { PurgeCSS } from "purgecss";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const targets = [
  "src/styles/original.css",
  "src/styles/rocket-pairs.css",
];

const safelist = {
  standard: [
    "fix_smartphone", "fix_smartphone_href",
    "fix_smartphone1", "fix_smartphone_href1",
    "fix_smartphone2", "fix_smartphone_href2",
    "submenu-open", "has-submenu", "sub-arrow", "menu-item-has-children",
    "animated", "elementor-invisible", "elementor-active", "e-active",
    "html", "body", "rtl",
  ],
  deep: [
    /^e-con/, /^e-parent/, /^e-child/, /^e-flex/, /^e-n-/, /^e-gallery/,
    /^swiper/,
    /^page-id-/, /^postid-/, /^category-/, /^tag-/, /^single-/, /^page-template/,
    /^wp-/,
    /^fadeIn/, /^fadeOut/, /^slideIn/, /^slideOut/, /^zoomIn/, /^zoomOut/,
    /^bounce/, /^flip/, /^pulse/, /^shake/, /^rubberBand/,
    /^animate/, /^animated-/,
    /^lgr-/, /^rpi-/, /^trustindex/,
    /^menu-item/, /^sub-menu/,
    /^elementor-tab-/, /^elementor-active/, /^elementor-invisible/,
    /^elementor-animation-/, /^elementor-motion-/, /^elementor-lightbox/,
    /^elementor-nav-menu__/, /^elementor-sub-item/,
    /^elementor-swiper-/, /^elementor-slide-/,
    /^elementor-hidden-/, /^elementor-align-/, /^elementor-view-/,
    /^elementor-repeater-item-/, /^elementor-open/, /^elementor-clickable/,
    /^elementor-arrow/, /^elementor-star/,
    /^rtl/, /-rtl$/,
  ],
  variables: true,
  keyframes: true,
};

const content = [
  "src/generated/**/*.html",
  "src/**/*.tsx",
  "src/**/*.ts",
  "/tmp/purge-content/all.html",
];

async function run() {
  const results = await new PurgeCSS().purge({
    content,
    css: targets.map((f) => path.join(root, f)),
    safelist,
    fontFace: false,
    keyframes: false,
    variables: false,
  });

  for (const r of results) {
    const orig = fs.statSync(r.file).size;
    fs.writeFileSync(r.file, r.css);
    const now = Buffer.byteLength(r.css);
    console.log(`${path.relative(root, r.file)}: ${(orig/1024).toFixed(1)}KB -> ${(now/1024).toFixed(1)}KB`);
  }
}

run().catch((e) => { console.error(e); process.exit(1); });