#!/usr/bin/env node
// Build public/assets/elementor-site.css — the subset of the heavy Elementor
// bundle that any NON-home route can actually render.
//
// Before this, every non-home route blocked paint on the full 812KB
// elementor-heavy.css. That bundle is the whole site's Elementor output, so it
// carries rules for widgets no template uses. Purging it against the shell plus
// all five single templates and the three archive templates keeps one bundle
// (so there is no per-route stylesheet swap, which is what caused CLS ~1.0 when
// it was tried before) while dropping what nothing can render.
//
// The safelist mirrors scripts/home-critical.mjs, since the same runtime
// classes are added by src/lib/elementor-enhance.ts on every route.
import { PurgeCSS } from "purgecss";
import postcss from "postcss";
import discardDuplicates from "postcss-discard-duplicates";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Relative paths on purpose: this repo lives under a directory with Hebrew
// characters and spaces, and PurgeCSS's globber silently matches nothing when
// handed such an absolute path — it returns an empty stylesheet rather than an
// error. Everything below runs with cwd = repo root.
const SRC = "public/assets/elementor-heavy.css";
const OUT = path.join(root, "public/assets/elementor-site.css");

const safelist = {
  standard: [
    "html", "body", "rtl", "home",
    "animated", "elementor-invisible", "elementor-in-view",
    "elementor-active", "e-active", "e-lazyloaded",
    "has-submenu", "submenu-open", "sub-arrow", "menu-item-has-children",
    "elementor-off-canvas-open", "elementor-video-iframe",
    "rr-field-error", "rr-injected", "rpi",
    "fix_smartphone", "fix_smartphone_href",
    "fix_smartphone1", "fix_smartphone_href1",
    "fix_smartphone2", "fix_smartphone_href2",
  ],
  deep: [
    /^e-con/, /^e-parent/, /^e-child/, /^e-flex/, /^e-grid/, /^e-n-/, /^e-gallery/,
    /^swiper/,
    /^elementor-invisible/, /^elementor-animation-/, /^elementor-motion-/,
    /^page-id-/, /^page-template/, /^elementor-page-/, /^elementor-\d+/,
    /^menu-item/, /^sub-menu/,
    /^fadeIn/, /^fadeOut/, /^slideIn/, /^slideOut/, /^zoomIn/, /^zoomOut/,
    /^bounce/, /^flip/, /^pulse/, /^shake/, /^rubberBand/, /^animate/,
    /^rpi-/, /^trustindex/, /^pojo-a11y/,
    /^lvbl-/, /^rr-/, /^crs-/,
    /^rtl/, /-rtl$/,
  ],
  greedy: [
    /swiper/, /e-n-tab/, /elementor-tab-/, /pojo-a11y/, /rpi/,
    /elementor-invisible/, /animated/, /e-lazyloaded/, /elementor-active/,
    /e-active/, /submenu-open/, /sub-arrow/, /has-submenu/,
    /elementor-off-canvas/, /elementor-menu-toggle/, /elementor-nav-menu/,
    /elementor-video/, /elementor-message/, /elementor-lightbox/,
    /elementor-slide/, /elementor-counter/, /elementor-pagination/,
    /elementor-arrow/, /elementor-star/, /rr-field-error/, /rr-injected/,
    /elementor-toggle/, /elementor-accordion/, /elementor-gallery/,
    /elementor-widget-/, /elementor-posts/, /elementor-portfolio/,
  ],
  variables: true,
  keyframes: true,
};

// Every template a non-home route can render, plus the shell and the components
// that inject markup at runtime.
const content = [
  "src/generated/header.html",
  "src/generated/footer.html",
  "src/generated/templates/*.html",
  "src/generated/archives/*.html",
  "src/components/**/*.tsx",
  "src/routes/**/*.tsx",
  "src/lib/elementor-enhance.ts",
];

// Body classes vary per page (page-id-*, elementor-page-*); feed a representative
// shell so body-scoped rules survive. The deep safelist covers the numeric ids.
const BODY_CLASS =
  "rtl wp-singular page-template page-template-elementor_header_footer page wp-custom-logo " +
  "wp-embed-responsive wp-theme-hello-elementor eio-default manage-default ally-default " +
  "esm-default hello-elementor-default elementor-default elementor-template-full-width " +
  "elementor-kit-7 elementor-page single single-post archive category";

async function run() {
  const tmp = path.join(os.tmpdir(), "site-css-shell.html");
  fs.writeFileSync(
    tmp,
    `<html lang="he-IL" dir="rtl" class="${BODY_CLASS}"><body class="${BODY_CLASS}"></body></html>`,
  );

  const results = await new PurgeCSS().purge({
    content: [...content, tmp],
    css: [SRC],
    safelist,
    fontFace: false,
    keyframes: false,
    variables: false,
  });

  const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1) + "KB";
  let css = results.map((r) => r.css).join("\n");
  console.log("  purged   :", kb(css));
  css = css.replace(/\/\*[\s\S]*?\*\//g, "");
  console.log("  comments :", kb(css));
  css = (await postcss([discardDuplicates()]).process(css, { from: undefined })).css;
  console.log("  deduped  :", kb(css));
  // Assistant/Roboto arrive from the inlined self-hosted @font-face block in
  // RootShell, so the 227 bundled copies here are dead weight.
  css = css.replace(/@font-face\s*{[^}]*}/g, (block) =>
    /font-family:\s*['"]?(Roboto|Roboto Slab|Assistant)/i.test(block) ? "" : block,
  );
  css = css.replace(/\n{2,}/g, "\n").trim();

  const orig = fs.statSync(SRC).size;
  const out = Buffer.byteLength(css);
  // Guard against a purge that silently strips almost everything.
  if (out < orig * 0.25) {
    throw new Error(
      `Refusing to write elementor-site.css: ${(out / 1024).toFixed(1)}KB is under 25% of the source ${(orig / 1024).toFixed(1)}KB`,
    );
  }
  fs.writeFileSync(OUT, css);
  console.log(
    `elementor-site.css: ${(orig / 1024).toFixed(1)}KB -> ${(out / 1024).toFixed(1)}KB (${Math.round(100 - (out / orig) * 100)}% smaller)`,
  );
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
