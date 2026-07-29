import penthouse from 'penthouse';
import fs from 'node:fs';

const css = fs.readFileSync('/tmp/full.css', 'utf8');
const url = 'http://localhost:8080/';

async function run(width, height) {
  return await penthouse({
    url, cssString: css,
    width, height,
    timeout: 90000,
    puppeteer: { getBrowser: undefined },
    renderWaitTime: 1500,
    blockJSRequests: false,
    keepLargerMediaQueries: false,
    forceInclude: [
      /^body\.rtl/, /^body\.home/, /^body\.page-id-57/,
      /^\.elementor-kit-7/,
      /elementor-location-header/, /elementor-section/, /elementor-container/,
      /elementor-widget/, /elementor-element/, /e-con/, /e-parent/, /e-child/,
      /elementor-heading-title/, /elementor-button/, /elementor-icon/,
      /elementor-image/, /elementor-widget-image/,
      /elementor-invisible/, /animated/,
      /elementor-column/, /elementor-row/,
    ],
  });
}

const mobile = await run(390, 844);
console.error('mobile bytes:', mobile.length);
const desktop = await run(1366, 900);
console.error('desktop bytes:', desktop.length);

// merge by dedup rule text
function extractRules(cssText) {
  const rules = new Set();
  // naive split at top-level `}` - handles most cases including @media (kept as single block)
  let depth = 0, buf = '', cur = '';
  for (const ch of cssText) {
    cur += ch;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { rules.add(cur.trim()); cur = ''; } }
  }
  return rules;
}
const a = extractRules(mobile), b = extractRules(desktop);
for (const r of b) a.add(r);
const merged = [...a].join('\n');
fs.writeFileSync('src/generated/critical.css', merged);
console.error('merged bytes:', merged.length);
