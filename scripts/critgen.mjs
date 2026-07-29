import penthouse from 'penthouse';
import fs from 'node:fs';

const CSS = fs.readFileSync('/tmp/full.css', 'utf8');
const URL = 'http://localhost:8080/';

const forceInclude = [
  /elementor-kit-7/,
  'elementor-57',
  'elementor-49',
  'elementor-location-header',
  'elementor-nav-menu', 'elementor-nav-menu--main',
  'elementor-nav-menu--dropdown', 'elementor-menu-toggle',
  'sub-arrow',
  'e-con', 'e-parent', 'e-child',
  'elementor-widget-container',
  'elementor-heading-title',
  'elementor-button',
  'elementor-counter',
  'elementor-image',
  'elementor-invisible',
  'elementor-hidden-mobile', 'elementor-hidden-tablet', 'elementor-hidden-desktop',
  'elementor-hidden-mobile_extra', 'elementor-hidden-tablet_extra',
];

async function run(width, height, out) {
  const css = await penthouse({
    url: URL,
    cssString: CSS,
    width, height,
    timeout: 90000,
    forceInclude,
    propertiesToRemove: [], // keep all
    puppeteer: { getBrowser: undefined },
    renderWaitTime: 2000,
    blockJSRequests: false,
  });
  fs.writeFileSync(out, css);
  console.log(out, 'bytes=', Buffer.byteLength(css));
}

await run(390, 844, '/tmp/critgen/m.css');
await run(1366, 900, '/tmp/critgen/d.css');
