const fs = require('node:fs');
const path = require('node:path');
require('./prepare-assets.cjs');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const name of ['index.html', 'collector.html']) {
  fs.copyFileSync(path.join(root, name), path.join(output, name));
}
fs.cpSync(path.join(root, 'assets'), path.join(output, 'assets'), { recursive: true });
console.log('Public build prepared: HTML, browser code, styles and local OCR assets only');
