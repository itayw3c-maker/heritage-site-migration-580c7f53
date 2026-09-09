#!/usr/bin/env node
// Build public/assets/home-critical.css = the subset of the heavy Elementor CSS
// needed for the HOME PAGE's first viewport. The full app/Elementor styles are
// loaded after first paint, so this file should stay aggressively small.
import { PurgeCSS } from "purgecss";
import postcss from "postcss";
import discardDuplicates from "postcss-discard-duplicates";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "public/assets/home-critical.css");

const safelist = {
  standard: [
    "html", "body", "rtl", "home",
    "animated", "elementor-invisible", "elementor-in-view",
    "elementor-active", "e-active", "e-lazyloaded",
    "has-submenu", "submenu-open", "sub-arrow", "menu-item-has-children",
    "elementor-off-canvas-open",
    "fix_smartphone", "fix_smartphone_href",
    "fix_smartphone1", "fix_smartphone_href1",
    "fix_smartphone2", "fix_smartphone_href2",
  ],
  deep: [
    /^e-con/, /^e-parent/, /^e-child/, /^e-flex/, /^e-grid/,
    /^elementor-invisible/, /^elementor-animation-/, /^elementor-motion-/,
    /^page-id-57/, /^page-template/,
    /^menu-item/, /^sub-menu/,
    /^fadeIn/, /^fadeOut/, /^slideIn/, /^slideOut/, /^zoomIn/, /^zoomOut/,
    /^bounce/, /^flip/, /^pulse/, /^shake/, /^rubberBand/, /^animate/,
    /^rtl/, /-rtl$/,
  ],
  greedy: [
    /e-n-tab/,
    /elementor-invisible/, /animated/, /e-lazyloaded/, /elementor-active/,
    /e-active/, /submenu-open/, /sub-arrow/, /has-submenu/,
    /elementor-off-canvas/, /elementor-menu-toggle/, /elementor-nav-menu/,
    /elementor-message/,
  ],
  variables: true,
  keyframes: true,
};

const content = [
  "src/generated/main.html",
  "src/generated/header.html",
  "src/components/SiteHeader.tsx",
  "src/routes/__root.tsx",
  "src/routes/index.tsx",
];

const BODY_CLASS =
  "rtl home wp-singular page-template page-template-elementor_header_footer page page-id-57 wp-custom-logo wp-embed-responsive wp-theme-hello-elementor eio-default manage-default ally-default esm-default hello-elementor-default elementor-default elementor-template-full-width elementor-kit-7 elementor-page elementor-page-57";

async function run() {
  // Feed the body/html class strings as extra content so body-scoped rules stay.
  const tmp = path.join(os.tmpdir(), "home-critical-shell.html");
  fs.writeFileSync(
    tmp,
    `<html lang="he-IL" dir="rtl" class="${BODY_CLASS}"><body class="${BODY_CLASS}"></body></html>`
  );

  const results = await new PurgeCSS().purge({
    content: [...content, tmp],
    // Relative on purpose — see scripts/site-css.mjs. PurgeCSS's globber matches
    // nothing when given an absolute path containing Hebrew characters or
    // spaces, which this repo's directory has. It fails silently, so the guard
    // below was quietly preserving a stale home-critical.css on every build.
    css: ["public/assets/elementor-heavy.css"],
    safelist,
    fontFace: true,
    keyframes: false,
    variables: false,
  });

  let css = results.map((r) => r.css).join("\n");
  // Drop sourceURL comments and duplicate rules (the source bundles Roboto
  // @font-face blocks dozens of times).
  css = css.replace(/\/\*[\s\S]*?\*\//g, "");
  css = (await postcss([discardDuplicates()]).process(css, { from: undefined })).css;
  css = css.replace(/\n{2,}/g, "\n").trim();
  // Roboto / Roboto Slab / Assistant already arrive via the blocking Google
  // Fonts <link> in RootShell — the bundled duplicates are dead weight here.
  css = css.replace(/@font-face\s*{[^}]*}/g, (block) =>
    /font-family:\s*'?(Roboto|Roboto Slab|Assistant)'?/i.test(block) ? "" : block
  );
  css = css.replace(/\n{2,}/g, "\n").trim();
  if (Buffer.byteLength(css) < 10_000) {
    if (fs.existsSync(OUT) && fs.statSync(OUT).size >= 10_000) {
      console.warn("PurgeCSS returned an unexpectedly small result; preserving existing home-critical.css");
      return;
    }
    throw new Error("Refusing to create an unexpectedly small home-critical.css");
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, css);
  const orig = fs.statSync(path.join(root, "public/assets/elementor-heavy.css")).size;
  console.log(
    `home-critical.css: ${(orig / 1024).toFixed(1)}KB -> ${(Buffer.byteLength(css) / 1024).toFixed(1)}KB`
  );
}
run().catch((e) => { console.error(e); process.exit(1); });
