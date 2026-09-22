// Build step: publish the pinned dependency locally, retaining its licence.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dest = path.join(root, 'assets/vendor');
fs.mkdirSync(dest, { recursive: true });
for (const [source, target] of [['dist/motion.js', 'motion.js'], ['LICENSE.md', 'motion-LICENSE.txt']]) {
  fs.copyFileSync(path.join(root, 'node_modules/motion', source), path.join(dest, target));
}
console.log('Vendored Motion', require('../node_modules/motion/package.json').version);
