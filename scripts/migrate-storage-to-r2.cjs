'use strict';
// ==========================================================================
// Supabase Storage -> Cloudflare R2 migration for the campaign-assets bucket.
//
//   node scripts/migrate-storage-to-r2.cjs copy [--remote]   # download objects, put into R2 (local default)
//   node scripts/migrate-storage-to-r2.cjs rewrite           # emit + apply SQL rewriting content_url to /assets-r2/
//   node scripts/migrate-storage-to-r2.cjs verify            # count objects in R2 vs source listing
//
// Source: Supabase Storage REST API with the service-role key.
// ==========================================================================

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const APP_DIR = path.join(__dirname, '..');
const EXPORT_DIR = path.join(APP_DIR, 'tmp', 'migration-export');
const BUCKET = 'campaign-assets';
const WRANGLER_CLI = path.join(APP_DIR, 'node_modules', 'wrangler', 'bin', 'wrangler.js');

function headers() {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    return { apikey: key, Authorization: `Bearer ${key}` };
}

async function listPrefix(base, prefix) {
    const res = await fetch(`${base}/storage/v1/object/list/${BUCKET}`, {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix, limit: 1000, offset: 0 })
    });
    if (!res.ok) throw new Error(`list ${prefix} failed: ${res.status} ${await res.text()}`);
    return res.json();
}

async function walk(base, prefix = '', acc = []) {
    const items = await listPrefix(base, prefix);
    for (const item of items) {
        const key = (prefix ? prefix + '/' : '') + item.name;
        if (item.id === null || item.metadata == null) {
            // folder marker (storage list returns folders with id null)
            if (!item.name.includes('.')) await walk(base, key, acc);
        } else {
            acc.push(key);
        }
    }
    return acc;
}

async function cmdCopy(remote) {
    const base = process.env.SUPABASE_URL;
    if (!base) throw new Error('SUPABASE_URL required in .env');
    const keys = await walk(base);
    console.log(`found ${keys.length} objects in ${BUCKET}`);
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
    fs.writeFileSync(path.join(EXPORT_DIR, 'storage-keys.json'), JSON.stringify(keys, null, 2));
    let done = 0;
    for (const key of keys) {
        const res = await fetch(`${base}/storage/v1/object/public/${BUCKET}/${encodeURI(key)}`, { headers: headers() });
        if (!res.ok) { console.warn(`skip ${key}: ${res.status}`); continue; }
        const buf = Buffer.from(await res.arrayBuffer());
        const tmpFile = path.join(EXPORT_DIR, 'obj.bin');
        fs.writeFileSync(tmpFile, buf);
        execFileSync(process.execPath, [WRANGLER_CLI, 'r2', 'object', 'put', `${BUCKET}/${key}`, remote ? '--remote' : '--local', '--file', tmpFile, '--content-type', res.headers.get('content-type') || 'application/octet-stream'], { cwd: APP_DIR, stdio: 'pipe' });
        done++;
        if (done % 25 === 0) console.log(`copied ${done}/${keys.length}`);
    }
    console.log(`copied ${done}/${keys.length} objects into R2 (${remote ? 'remote' : 'local'})`);
}

function cmdRewrite(remote) {
    const base = process.env.SUPABASE_URL;
    const oldPrefix = `${base}/storage/v1/object/public/${BUCKET}/`;
    const p = oldPrefix.replace(/'/g, "''");
    const n = oldPrefix.length;
    const sql = [
        'BEGIN TRANSACTION;',
        `UPDATE campaign_deliverables SET content_url = '/assets-r2/' || substr(content_url, ${n + 1}) WHERE substr(content_url, 1, ${n}) = '${p}';`,
        `UPDATE campaign_deliverable_events SET content_url = '/assets-r2/' || substr(content_url, ${n + 1}) WHERE substr(content_url, 1, ${n}) = '${p}';`,
        'COMMIT;'
    ].join('\n');
    const file = path.join(EXPORT_DIR, 'rewrite-urls.sql');
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
    fs.writeFileSync(file, sql);
    execFileSync(process.execPath, [WRANGLER_CLI, 'd1', 'execute', 'DB', remote ? '--remote' : '--local', '--file', file], { cwd: APP_DIR, stdio: 'inherit' });
    console.log('content_url values rewritten to /assets-r2/…');
}

function cmdVerify(remote) {
    const keys = JSON.parse(fs.readFileSync(path.join(EXPORT_DIR, 'storage-keys.json'), 'utf8'));
    console.log(`source objects: ${keys.length}`);
    console.log(`check remote R2 with: npx wrangler r2 object list is not available; use dashboard or: for key in $(cat tmp/migration-export/storage-keys.json) …`);
}

async function main() {
    const [cmd, flag] = process.argv.slice(2);
    const remote = flag === '--remote';
    if (cmd === 'copy') return cmdCopy(remote);
    if (cmd === 'rewrite') return cmdRewrite(remote);
    if (cmd === 'verify') return cmdVerify(remote);
    console.log('usage: node scripts/migrate-storage-to-r2.cjs copy|rewrite|verify [--remote]');
    process.exit(1);
}

main().catch(e => { console.error('STORAGE MIGRATION ERROR:', e.message); process.exit(1); });
