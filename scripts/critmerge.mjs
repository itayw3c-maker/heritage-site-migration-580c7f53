import fs from 'node:fs';
import postcss from 'postcss';
import dedupe from 'postcss-discard-duplicates';

const m = fs.readFileSync('/tmp/critgen/m.css', 'utf8');
const d = fs.readFileSync('/tmp/critgen/d.css', 'utf8');
const combined = m + '\n' + d;
const out = await postcss([dedupe()]).process(combined, { from: undefined });
fs.writeFileSync('src/generated/critical.css', out.css);
console.log('merged bytes=', Buffer.byteLength(out.css));
