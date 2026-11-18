'use strict';
// ==========================================================================
// Creator Cash Flow - D1 (SQLite) client implementing the supabase-js subset
// used by this codebase. Activated only inside the Cloudflare Worker when the
// worker entry sets globalThis.__CCF_D1__ = env.DB before requiring server.js.
// In plain node (dev/tests) this module is never used: services/supabase.js
// keeps its existing behavior and controllers fall back to memoryDb.
//
// Supported chain surface (everything the app actually calls):
//   from(t).select(cols?, {count, head}?).eq/in/is/gt/gte/lt/lte(...).order(...).limit(n).single()/.maybeSingle()
//   from(t).insert(rows)[.select(cols?).single()/.maybeSingle()]
//   from(t).update(patch).eq(...).is(...).select(cols?)[.maybeSingle()]
//   from(t).upsert(rows, { onConflict, ignoreDuplicates? })
//   from(t).delete().eq(...)
// Result shape mirrors supabase-js: { data, error, count }.
// ==========================================================================

// Columns stored as TEXT in SQLite but JSON in the app layer.
const JSON_COLUMNS = {
    onboarding_responses: ['platforms'],
    campaign_creators: ['data_scope'],
    campaign_access_grants: ['scope'],
    campaign_reports: ['narrative', 'posts', 'campaign_snapshot']
};

function jsonColsFor(table) {
    return JSON_COLUMNS[table] || [];
}

function serializeValue(table, col, value) {
    if (value === undefined) return null;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (jsonColsFor(table).includes(col) && value !== null && typeof value === 'object') {
        return JSON.stringify(value);
    }
    return value;
}

function parseRow(table, row) {
    if (!row || typeof row !== 'object') return row;
    const out = { ...row };
    for (const col of jsonColsFor(table)) {
        const v = out[col];
        if (typeof v === 'string' && v.length > 0) {
            try { out[col] = JSON.parse(v); } catch (_) { /* leave as string */ }
        }
    }
    return out;
}

function mapError(err) {
    const msg = String((err && err.message) || err);
    if (/UNIQUE constraint failed/i.test(msg)) {
        return { message: `duplicate key value violates unique constraint (${msg})`, code: '23505', details: msg };
    }
    if (/FOREIGN KEY constraint failed/i.test(msg)) {
        return { message: `insert or update on table violates foreign key constraint (${msg})`, code: '23503', details: msg };
    }
    if (/CHECK constraint failed/i.test(msg)) {
        return { message: `check constraint violated (${msg})`, code: '23514', details: msg };
    }
    if (/NOT NULL constraint failed/i.test(msg)) {
        return { message: `null value violates not-null constraint (${msg})`, code: '23502', details: msg };
    }
    return { message: msg, code: 'D1_ERROR' };
}

function quoteIdent(name) {
    return '"' + String(name).replace(/"/g, '""') + '"';
}

class QueryBuilder {
    constructor(db, table) {
        this.db = db;
        this.table = table;
        this.op = 'select';
        this.columns = '*';
        this.selectOpts = {};
        this.filters = [];
        this.orders = [];
        this.limitN = null;
        this.mode = null; // null | 'single' | 'maybeSingle'
        this.payload = null;
        this.upsertOpts = {};
        this.returning = null; // null (no returning) | '*' | 'col1,col2'
    }

    _clone() {
        const q = new QueryBuilder(this.db, this.table);
        Object.assign(q, {
            op: this.op, columns: this.columns, selectOpts: { ...this.selectOpts },
            filters: [...this.filters], orders: [...this.orders], limitN: this.limitN,
            mode: this.mode, payload: this.payload, upsertOpts: { ...this.upsertOpts },
            returning: this.returning
        });
        return q;
    }

    select(columns = '*', opts = {}) {
        const q = this._clone();
        q.columns = columns || '*';
        q.selectOpts = opts || {};
        if (q.op === 'insert' || q.op === 'update' || q.op === 'delete') q.returning = q.columns;
        return q;
    }

    insert(rows) {
        const q = this._clone();
        q.op = 'insert';
        q.payload = Array.isArray(rows) ? rows : [rows];
        return q;
    }

    update(patch) {
        const q = this._clone();
        q.op = 'update';
        q.payload = patch || {};
        return q;
    }

    upsert(rows, opts = {}) {
        const q = this._clone();
        q.op = 'upsert';
        q.payload = Array.isArray(rows) ? rows : [rows];
        q.upsertOpts = opts || {};
        return q;
    }

    delete() {
        const q = this._clone();
        q.op = 'delete';
        return q;
    }

    _addFilter(op, col, val) {
        const q = this._clone();
        q.filters.push({ op, col, val });
        return q;
    }

    eq(col, val) { return this._addFilter('eq', col, val); }
    neq(col, val) { return this._addFilter('neq', col, val); }
    gt(col, val) { return this._addFilter('gt', col, val); }
    gte(col, val) { return this._addFilter('gte', col, val); }
    lt(col, val) { return this._addFilter('lt', col, val); }
    lte(col, val) { return this._addFilter('lte', col, val); }
    is(col, val) { return this._addFilter('is', col, val); }
    in(col, vals) { return this._addFilter('in', col, vals); }

    order(col, opts = {}) {
        const q = this._clone();
        q.orders.push({ col, ascending: opts.ascending !== false });
        return q;
    }

    limit(n) {
        const q = this._clone();
        q.limitN = n;
        return q;
    }

    single() {
        const q = this._clone();
        q.mode = 'single';
        return q;
    }

    maybeSingle() {
        const q = this._clone();
        q.mode = 'maybeSingle';
        return q;
    }

    _whereClause() {
        const params = [];
        const parts = [];
        for (const f of this.filters) {
            const c = quoteIdent(f.col);
            switch (f.op) {
                case 'eq': parts.push(`${c} = ?`); params.push(serializeValue(this.table, f.col, f.val)); break;
                case 'neq': parts.push(`${c} <> ?`); params.push(serializeValue(this.table, f.col, f.val)); break;
                case 'gt': parts.push(`${c} > ?`); params.push(serializeValue(this.table, f.col, f.val)); break;
                case 'gte': parts.push(`${c} >= ?`); params.push(serializeValue(this.table, f.col, f.val)); break;
                case 'lt': parts.push(`${c} < ?`); params.push(serializeValue(this.table, f.col, f.val)); break;
                case 'lte': parts.push(`${c} <= ?`); params.push(serializeValue(this.table, f.col, f.val)); break;
                case 'is':
                    if (f.val === null || f.val === undefined) parts.push(`${c} IS NULL`);
                    else { parts.push(`${c} = ?`); params.push(serializeValue(this.table, f.col, f.val)); }
                    break;
                case 'in': {
                    const arr = Array.isArray(f.val) ? f.val : [f.val];
                    if (arr.length === 0) { parts.push('1 = 0'); break; }
                    parts.push(`${c} IN (${arr.map(() => '?').join(',')})`);
                    for (const v of arr) params.push(serializeValue(this.table, f.col, v));
                    break;
                }
                default: throw new Error('Unsupported filter op: ' + f.op);
            }
        }
        return { sql: parts.length ? ' WHERE ' + parts.join(' AND ') : '', params };
    }

    _orderLimitClause(extraLimit) {
        let sql = '';
        if (this.orders.length) {
            sql += ' ORDER BY ' + this.orders.map(o => `${quoteIdent(o.col)} ${o.ascending ? 'ASC' : 'DESC'}`).join(', ');
        }
        const lim = extraLimit != null ? extraLimit : this.limitN;
        if (lim != null) sql += ` LIMIT ${Math.max(0, parseInt(lim, 10) || 0)}`;
        return sql;
    }

    async _countOnly() {
        const w = this._whereClause();
        const row = await this.db.prepare(`SELECT COUNT(*) AS c FROM ${quoteIdent(this.table)}${w.sql}`).bind(...w.params).first();
        return { data: null, error: null, count: row ? row.c : 0 };
    }

    async execute() {
        try {
            if (this.op === 'select') {
                if (this.selectOpts.head) return await this._countOnly();
                const w = this._whereClause();
                const cols = this.columns === '*' ? '*' : this.columns.split(',').map(s => quoteIdent(s.trim())).join(', ');
                let lim = this.limitN;
                if (this.mode === 'single' || this.mode === 'maybeSingle') lim = 1;
                const sql = `SELECT ${cols} FROM ${quoteIdent(this.table)}${w.sql}${this._orderLimitClause(lim)}`;
                const res = await this.db.prepare(sql).bind(...w.params).all();
                let rows = (res.results || []).map(r => parseRow(this.table, r));
                if (this.mode === 'single') {
                    if (rows.length !== 1) {
                        return { data: null, error: { code: 'PGRST116', message: `JSON object requested, multiple (or no) rows returned (${rows.length})` } };
                    }
                    return { data: rows[0], error: null };
                }
                if (this.mode === 'maybeSingle') {
                    return { data: rows[0] || null, error: null };
                }
                return { data: rows, error: null };
            }

            if (this.op === 'insert' || this.op === 'upsert') {
                const rows = this.payload || [];
                if (!rows.length) return { data: null, error: null };
                const cols = Object.keys(rows[0]);
                const colSql = cols.map(quoteIdent).join(', ');
                const valSql = rows.map(() => `(${cols.map(() => '?').join(',')})`).join(', ');
                const params = [];
                for (const r of rows) for (const c of cols) params.push(serializeValue(this.table, c, r[c]));
                let sql = `INSERT INTO ${quoteIdent(this.table)} (${colSql}) VALUES ${valSql}`;
                if (this.op === 'upsert') {
                    const oc = this.upsertOpts.onConflict;
                    if (this.upsertOpts.ignoreDuplicates) {
                        sql += ' ON CONFLICT DO NOTHING';
                    } else if (oc) {
                        const ocCols = String(oc).split(',').map(s => quoteIdent(s.trim())).join(', ');
                        const setCols = cols.map(c => `${quoteIdent(c)} = excluded.${quoteIdent(c)}`).join(', ');
                        sql += ` ON CONFLICT (${ocCols}) DO UPDATE SET ${setCols}`;
                    }
                }
                if (this.returning) {
                    const rc = this.returning === '*' ? '*' : this.returning.split(',').map(s => quoteIdent(s.trim())).join(', ');
                    sql += ` RETURNING ${rc}`;
                    const res = await this.db.prepare(sql).bind(...params).all();
                    const out = (res.results || []).map(r => parseRow(this.table, r));
                    if (this.mode === 'single') {
                        if (out.length !== 1) return { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } };
                        return { data: out[0], error: null };
                    }
                    if (this.mode === 'maybeSingle') return { data: out[0] || null, error: null };
                    return { data: out, error: null };
                }
                await this.db.prepare(sql).bind(...params).run();
                if (this.mode === 'single' || this.mode === 'maybeSingle') return { data: null, error: null };
                return { data: null, error: null };
            }

            if (this.op === 'update') {
                const patch = this.payload || {};
                const cols = Object.keys(patch);
                if (!cols.length) return { data: null, error: null };
                const setSql = cols.map(c => `${quoteIdent(c)} = ?`).join(', ');
                const params = cols.map(c => serializeValue(this.table, c, patch[c]));
                const w = this._whereClause();
                params.push(...w.params);
                let sql = `UPDATE ${quoteIdent(this.table)} SET ${setSql}${w.sql}`;
                if (this.returning) {
                    const rc = this.returning === '*' ? '*' : this.returning.split(',').map(s => quoteIdent(s.trim())).join(', ');
                    sql += ` RETURNING ${rc}`;
                    const res = await this.db.prepare(sql).bind(...params).all();
                    const out = (res.results || []).map(r => parseRow(this.table, r));
                    if (this.mode === 'single') {
                        if (out.length !== 1) return { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } };
                        return { data: out[0], error: null };
                    }
                    if (this.mode === 'maybeSingle') return { data: out[0] || null, error: null };
                    return { data: out, error: null };
                }
                await this.db.prepare(sql).bind(...params).run();
                return { data: null, error: null };
            }

            if (this.op === 'delete') {
                const w = this._whereClause();
                let sql = `DELETE FROM ${quoteIdent(this.table)}${w.sql}`;
                if (this.returning) {
                    const rc = this.returning === '*' ? '*' : this.returning.split(',').map(s => quoteIdent(s.trim())).join(', ');
                    sql += ` RETURNING ${rc}`;
                    const res = await this.db.prepare(sql).bind(...w.params).all();
                    const out = (res.results || []).map(r => parseRow(this.table, r));
                    if (this.mode === 'maybeSingle') return { data: out[0] || null, error: null };
                    if (this.mode === 'single') return { data: out[0] || null, error: null };
                    return { data: out, error: null };
                }
                await this.db.prepare(sql).bind(...w.params).run();
                return { data: null, error: null };
            }

            return { data: null, error: { message: 'Unknown op ' + this.op, code: 'D1_ERROR' } };
        } catch (err) {
            return { data: null, error: mapError(err) };
        }
    }

    then(onFulfilled, onRejected) {
        return this.execute().then(onFulfilled, onRejected);
    }

    catch(onRejected) {
        return this.execute().catch(onRejected);
    }

    finally(onFinally) {
        return this.execute().finally(onFinally);
    }
}

function createD1Client(db) {
    if (!db) throw new Error('createD1Client requires a D1 binding');
    // Enable FK enforcement once per isolate; harmless if already on.
    try { db.exec('PRAGMA foreign_keys = ON'); } catch (_) { /* older local runtimes */ }
    return {
        from(table) {
            return new QueryBuilder(db, String(table));
        }
        // No `.storage` here on purpose: storageService checks for its presence
        // and (until the R2 phase) falls back gracefully.
    };
}

module.exports = { createD1Client, JSON_COLUMNS };
