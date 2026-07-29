import penthouse from 'penthouse';
import fs from 'fs';
import path from 'path';

const css = fs.readFileSync('/tmp/critgen/full.css', 'utf8');
const url = 'http://localhost:8080/';

// Locate Playwright's chromium
const base = '/root/.cache/ms-playwright';
let chromePath;
try {
  const dirs = fs.readdirSync(base).filter(d => d.startsWith('chromium'));
  for (const d of dirs) {
    const p = path.join(base, d, 'chrome-linux/chrome');
    if (fs.existsSync(p)) { chromePath = p; break; }
  }
} catch {}
// fallback: search PLAYWRIGHT_BROWSERS_PATH root
if (!chromePath) {
  const r = '/';
  // ignore, let penthouse find it
}
console.log('chromePath:', chromePath);

async function run(width, height, out) {
  const crit = await penthouse({
    url,
    cssString: css,
    width, height,
    timeout: 60000,
    renderWaitTime: 2500,
    puppeteer: chromePath ? { getBrowser: null } : undefined,
    chromePath,
    propertiesToRemove: [],
    forceInclude: [
      /^body/, /^html/, /elementor-kit-7/, /^:root/,
      /elementor-invisible/, /animated/,
      /a11y-fab/, /skip-link/,
      /cookie-banner/i,
      /fixdigital/i,
    ],
  });
  fs.writeFileSync(out, crit);
  console.log(out, crit.length);
}

await run(390, 844, '/tmp/critgen/mobile.css');
await run(1366, 900, '/tmp/critgen/desktop.css');
