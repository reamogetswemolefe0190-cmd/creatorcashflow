const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = { window: {}, document: { querySelector: () => null } };
vm.runInNewContext(fs.readFileSync('assets/ccf-landing.js', 'utf8'), context);
const html = context.window.CCFLanding();
assert.equal((html.match(/<h1\b/g) || []).length, 1);
assert.equal((html.match(/<article>/g) || []).length, 3);
assert(html.indexOf('class="ccf-preview"') < html.indexOf('class="ccf-roles"'));
assert(html.includes('Sample data'));
assert(html.includes('The workspace for creator campaigns'));
for (const route of ['signup', 'journey', 'creator', 'agency', 'brand', 'availability']) {
  assert(html.includes(`href="#${route}"`), `Missing ${route} link`);
}
assert(!html.includes('undefined'));
assert(!html.includes('<button'), 'Static preview should not imply interactive controls');
console.log('Landing content checks passed: hierarchy, sample disclosure, three roles and native routes.');
