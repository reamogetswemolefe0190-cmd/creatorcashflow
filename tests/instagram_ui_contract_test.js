'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const customer = fs.readFileSync('customer.js', 'utf8');
const client = fs.readFileSync('instagram-client.js', 'utf8');
const css = fs.readFileSync('customer.css', 'utf8');

assert.ok(html.indexOf('/instagram-client.js') < html.indexOf('/customer.js'), 'Instagram client must load before customer workspace');
assert.match(customer, /id="instagram-panel"/, 'Connected accounts must mount the Instagram panel');
assert.match(client, /esc\(post\.caption/, 'Provider captions must be HTML escaped');
assert.match(client, /Unavailable.not zero/, 'Unavailable metrics must not be displayed as zero');
assert.match(client, /encodeURIComponent\(after\)/, 'Pagination cursors must be encoded');
assert.match(css, /@media\(max-width:700px\).*#instagram-panel \.hq-connections article\{grid-template-columns:auto minmax\(0,1fr\)/s, 'Instagram account actions need a mobile layout');

console.log('Instagram UI contract checks passed.');
