'use strict';
// ==========================================================================
// Supabase (Postgres/PostgREST) -> Cloudflare D1 migration tool.
//
//   node scripts/migrate-supabase-to-d1.cjs export            # dump all tables to tmp/migration-export/*.json + checksums
//   node scripts/migrate-supabase-to-d1.cjs apply --local      # load dump into local D1 (wrangler dev state)
//   node scripts/migrate-supabase-to-d1.cjs apply --remote     # load dump into the deployed D1
//   node scripts/migrate-supabase-to-d1.cjs verify --local     # compare row counts + checksums D1 vs dump
//
// Source is read over PostgREST with the service-role key (no supabase-js
// dependency). JSON/JSONB columns arrive parsed and are re-serialized to TEXT
// for SQLite; row checksums use canonical JSON (sorted keys, rows sorted by
// primary key) so source and target can be compared exactly.
// ==========================================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const APP_DIR = path.join(__dirname, '..');
const EXPORT_DIR = path.join(APP_DIR, 'tmp', 'migration-export');

// table -> { pk: [cols], json: [cols] }
const TABLES = {
    users: { pk: ['id'], json: [] },
    transactions: { pk: ['id'], json: [] },
    onboarding_responses: { pk: ['user_id'], json: ['platforms'] },
    admin_users: { pk: ['id'], json: [] },
    audit_logs: { pk: ['id'], json: [] },
    ai_telemetry: { pk: ['id'], json: [] },
    instagram_oauth_attempts: { pk: ['state_hash'], json: [] },
    instagram_connections: { pk: ['user_id', 'instagram_id'], json: [] },
    instagram_deletion_receipts: { pk: ['code'], json: [] },
    youtube_connections: { pk: ['id'], json: [] },
    organizations: { pk: ['id'], json: [] },
    organization_members: { pk: ['organization_id', 'user_id'], json: [] },
    organization_invitations: { pk: ['id'], json: [] },
    campaigns: { pk: ['id'], json: [] },
    campaign_creators: { pk: ['campaign_id', 'creator_user_id'], json: ['data_scope'] },
    campaign_deliverables: { pk: ['id'], json: [] },
    campaign_metric_snapshots: { pk: ['id'], json: [] },
    campaign_access_grants: { pk: ['id'], json: ['scope'] },
    campaign_milestones: { pk: ['id'], json: [] },
    campaign_messages: { pk: ['id'], json: [] },
    campaign_reports: { pk: ['id'], json: ['narrative', 'posts', 'campaign_snapshot'] },
    campaign_deliverable_events: { pk: ['id'], json: [] },
    campaign_brand_requests: { pk: ['id'], json: [] }
};

const PAGE = 1000;

function canonical(value) {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (value && typeof value === 'object') {
        return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
    }
    return JSON.stringify(value === undefined ? null : value);
}

function checksum(rows, pkCols) {
    const sorted = rows.map(r => canonical(r)).sort();
    return crypto.createHash('sha256').update(sorted.join('\n')).digest('hex');
}

function sqlString(v) {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
    if (typeof v === 'boolean') return v ? '1' : '0';
    if (typeof v === 'object') return "'" + JSON.stringify(v).replace(/'/g, "''") + "'";
    return "'" + String(v).replace(/'/g, "''") + "'";
}

function rowToInsert(table, row, jsonCols) {
    const cols = Object.keys(row);
    const colSql = cols.map(c => `"${c}"`).join(', ');
    const valSql = cols.map(c => jsonCols.includes(c) && row[c] !== null && typeof row[c] === 'object'
        ? sqlString(row[c])
        : sqlString(row[c])).join(', ');
    return `INSERT OR IGNORE INTO "${table}" (${colSql}) VALUES (${valSql});`;
}

async function exportTable(base, headers, table) {
    const rows = [];
    for (let offset = 0; ; offset += PAGE) {
        const url = `${base}/rest/v1/${table}?select=*&limit=${PAGE}&offset=${offset}`;
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`export ${table} failed: ${res.status} ${await res.text()}`);
        const batch = await res.json();
        rows.push(...batch);
        if (batch.length < PAGE) break;
    }
    return rows;
}

async function cmdExport() {
    const base = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!base || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required in .env');
    const headers = { apikey: key, Authorization: `Bearer ${key}` };
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
    const manifest = { exportedAt: new Date().toISOString(), source: base, tables: {} };
    for (const [table, meta] of Object.entries(TABLES)) {
        const rows = await exportTable(base, headers, table);
        const sum = checksum(rows, meta.pk);
        fs.writeFileSync(path.join(EXPORT_DIR, table + '.json'), JSON.stringify(rows));
        manifest.tables[table] = { rows: rows.length, sha256: sum };
        console.log(`exported ${table}: ${rows.length} rows, sha256 ${sum.slice(0, 16)}…`);
    }
    fs.writeFileSync(path.join(EXPORT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log('manifest written to', EXPORT_DIR);
}

function dumpToSql() {
    // Delete children before parents (FK enforcement), insert parents first.
    const tables = Object.keys(TABLES);
    const lines = ['BEGIN TRANSACTION;'];
    for (const table of [...tables].reverse()) lines.push(`DELETE FROM "${table}";`);
    for (const table of tables) {
        const meta = TABLES[table];
        const file = path.join(EXPORT_DIR, table + '.json');
        if (!fs.existsSync(file)) continue;
        const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
        for (const row of rows) lines.push(rowToInsert(table, row, meta.json));
    }
    lines.push('COMMIT;');
    const sqlFile = path.join(EXPORT_DIR, 'load.sql');
    fs.writeFileSync(sqlFile, lines.join('\n'));
    return { sqlFile };
}

const WRANGLER_CLI = path.join(APP_DIR, 'node_modules', 'wrangler', 'bin', 'wrangler.js');

function wranglerD1(args, opts = {}) {
    return execFileSync(process.execPath, [WRANGLER_CLI, ...args], { cwd: APP_DIR, stdio: opts.inherit ? 'inherit' : 'pipe', encoding: 'utf8' });
}

function cmdApply(remote) {
    const { sqlFile } = dumpToSql();
    console.log(`applying ${sqlFile} (${remote ? 'remote' : 'local'})…`);
    wranglerD1(['d1', 'execute', 'DB', remote ? '--remote' : '--local', '--file=' + sqlFile], { inherit: true });
    console.log('apply done');
}

async function cmdVerify(remote) {
    const manifest = JSON.parse(fs.readFileSync(path.join(EXPORT_DIR, 'manifest.json'), 'utf8'));
    let ok = true;
    for (const [table, meta] of Object.entries(TABLES)) {
        const out = wranglerD1(['d1', 'execute', 'DB', remote ? '--remote' : '--local', '--command', `SELECT COUNT(*) AS c FROM "${table}"`, '--json']);
        const count = JSON.parse(out)[0].results[0].c;
        const match = count === manifest.tables[table].rows;
        if (!match) ok = false;
        console.log(`${match ? 'OK  ' : 'FAIL'} ${table}: d1=${count} source=${manifest.tables[table].rows} sha256=${manifest.tables[table].sha256.slice(0, 16)}…`);
    }
    console.log(ok ? 'VERIFY PASSED' : 'VERIFY FAILED');
    process.exit(ok ? 0 : 1);
}

async function main() {
    const [cmd, flag] = process.argv.slice(2);
    if (cmd === 'export') return cmdExport();
    if (cmd === 'apply') return cmdApply(flag === '--remote');
    if (cmd === 'verify') return cmdVerify(flag === '--remote');
    console.log('usage: node scripts/migrate-supabase-to-d1.cjs export|apply [--remote]|verify [--remote]');
    process.exit(1);
}

main().catch(e => { console.error('MIGRATION ERROR:', e.message); process.exit(1); });
