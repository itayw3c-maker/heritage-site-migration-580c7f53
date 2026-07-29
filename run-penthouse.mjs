import penthouse from 'penthouse';
import fs from 'node:fs';

const css = fs.readFileSync('/tmp/full.css', 'utf8');
const url = 'http://localhost:8080/';

async function run(width, height) {
  return await penthouse({
    url, cssString: css,
    width, height,
    timeout: 90000,
    renderWaitTime: 3000,
    blockJSRequests: false,
    keepLargerMediaQueries: false,
    forceInclude: [
      /elementor-location-header/,
      /elementor-nav-menu/,
      /elementor-menu-toggle/,
      /sub-arrow/,
      /elementor-hidden/,
      /elementor-hidden-mobile/,
      /elementor-hidden-tablet/,
      /elementor-hidden-desktop/,
      /elementor-invisible/,
      /elementor-image-box/,
      /elementor-counter/,
    ],
  });
}

const mobile = await run(390, 844);
console.error('mobile bytes:', mobile.length);
const desktop = await run(1366, 900);
console.error('desktop bytes:', desktop.length);

function extractRules(cssText) {
  const rules = [];
  let depth = 0, cur = '';
  for (const ch of cssText) {
    cur += ch;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { rules.push(cur.trim()); cur = ''; } }
  }
  return rules;
}
const seen = new Set();
const out = [];
for (const r of [...extractRules(mobile), ...extractRules(desktop)]) {
  if (seen.has(r)) continue;
  if (r.startsWith('@font-face')) continue;
  if (r.includes('.rpi') || r.includes('--rpi-logo-g')) continue;
  if (r.toLowerCase().includes('trustindex')) continue;
  if (r.includes('sgcc') || r.includes('--sgcc')) continue;
  seen.add(r); out.push(r);
}
const merged = out.join('\n');
fs.writeFileSync('src/generated/critical.css', merged);
console.error('merged bytes:', merged.length);
