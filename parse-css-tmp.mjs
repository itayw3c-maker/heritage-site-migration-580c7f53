import { transform } from 'lightningcss';
import fs from 'fs';
const css = fs.readFileSync('src/styles.css', 'utf8');
try {
  transform({
    filename: 'src/styles.css',
    code: Buffer.from(css),
    minify: false,
  });
  console.log('OK');
} catch (err) {
  console.error('Error:', err.message);
  if (err.loc) console.error('Line:', err.loc.line, 'Column:', err.loc.column, 'Index:', err.loc.index);
  if (err.fileName) console.error('File:', err.fileName);
}
