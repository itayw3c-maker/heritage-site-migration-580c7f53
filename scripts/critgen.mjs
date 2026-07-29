#!/usr/bin/env node
import penthouse from "penthouse";
import fs from "node:fs";
import path from "node:path";

const CSS_FILE = path.resolve("public/assets/elementor-heavy.css");
const OUT = path.resolve("src/generated/critical.css");
const URL = process.env.CRIT_URL || "http://localhost:8080/";

// Only include selectors that JS toggles or that penthouse can't detect
// (dynamic classes, font-face, root vars, kit scope).
const FORCE_INCLUDE = [
  /^html/, /^body/, /^:root/,
  /elementor-kit-7/,
  /@font-face/,
  /elementor-invisible/, /animated/,
  /fix_smartphone/,
  /page-id-57/,
  /--wpr-/, /wpr-bg-/,
];

const opts = (width, height) => ({
  url: URL,
  cssString: fs.readFileSync(CSS_FILE, "utf8"),
  width, height,
  timeout: 90000,
  renderWaitTime: 2500,
  keepLargerMediaQueries: true,
  forceInclude: FORCE_INCLUDE,
});

async function main() {
  console.log("mobile...");
  const mob = await penthouse(opts(414, 900));
  console.log("desktop...");
  const desk = await penthouse(opts(1440, 900));
  const merged = mob + "\n" + desk;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, merged);
  console.log(`critical.css: ${(merged.length / 1024).toFixed(1)}KB`);
}
main().catch(e => { console.error(e); process.exit(1); });
