'use strict';
// ==========================================================================
// Build a static-only bundle of the frontend into tmp/pages-dist/ for
// deploying to Cloudflare Pages (or Render/Netlify/Vercel) while the custom
// domain is still propagating. Server code, deps, secrets and tests are
// excluded. Usage: node scripts/build-static-dist.cjs
// ==========================================================================
const fs = require('fs');
const path = require('path');

const APP = path.join(__dirname, '..');
const OUT = path.join(APP, 'tmp', 'pages-dist');

// Root-level files that are safe static assets (frontend)
const ROOT_FILES = [
    'admin.html', 'agency.html', 'brand.html', 'campaign.html', 'index.html', 'invite.html', 'logo_showcase.html',
    'app.js', 'admin.js', 'customer.js', 'customer.css', 'dashboards.js', 'instagram-client.js', 'product-demo.js', 'style.css',
    'favicon.png', 'favicon.svg', 'icon-192.png', 'logo_transparent.png', 'manifest.json', 'robots.txt', 'sitemap.xml',
    'concept_mobius_ribbon.jpg', 'concept_studio_wallet.jpg', 'concept_vault_cube.jpg', 'concept_velocity_card.jpg', 'concept_void_monogram.jpg'
];
// Directories copied wholesale
const DIRS = ['assets'];
// Directories copied but with heavy/irrelevant entries skipped
const DIR_SKIP = { videos: [] };

function copyRecursive(src, dst, skipNames = new Set()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        if (skipNames.has(entry.name)) continue;
        const s = path.join(src, entry.name);
        const d = path.join(dst, entry.name);
        if (entry.isDirectory()) copyRecursive(s, d, skipNames);
        else fs.copyFileSync(s, d);
    }
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

let count = 0, bytes = 0;
function track(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) track(p);
        else { count++; bytes += fs.statSync(p).size; }
    }
}

for (const f of ROOT_FILES) {
    const src = path.join(APP, f);
    if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(OUT, f)); }
}
for (const d of DIRS) {
    const src = path.join(APP, d);
    if (fs.existsSync(src)) copyRecursive(src, path.join(OUT, d));
}
// videos dir if small enough (skip >25MB files to stay under Pages limits)
const videosSrc = path.join(APP, 'videos');
if (fs.existsSync(videosSrc)) {
    copyRecursive(videosSrc, path.join(OUT, 'videos'));
    for (const entry of fs.readdirSync(path.join(OUT, 'videos'), { withFileTypes: true })) {
        const p = path.join(OUT, 'videos', entry.name);
        if (!entry.isDirectory() && fs.statSync(p).size > 25 * 1024 * 1024) fs.rmSync(p);
    }
}

track(OUT);
console.log(`static bundle: ${count} files, ${(bytes / 1024 / 1024).toFixed(2)} MB -> ${OUT}`);
console.log('deploy with: npx wrangler pages deploy tmp/pages-dist --project-name ccf-wip');
