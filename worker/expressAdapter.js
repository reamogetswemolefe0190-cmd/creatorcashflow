'use strict';
// ==========================================================================
// Minimal Fetch-Request -> Express adapter for Cloudflare Workers.
// Express 4 assigns its request/response prototypes onto the objects passed
// to app.handle(), so a Readable req + a small res facade is enough for the
// full middleware stack (helmet, express.json, multer memoryStorage, routes).
// ==========================================================================

const { Readable } = require('stream');

function toNodeReq(request, bodyBuffer) {
    const url = new URL(request.url);
    const headers = {};
    request.headers.forEach((value, key) => { headers[key] = value; });

    let pushed = false;
    const req = new Readable({
        read() {
            if (!pushed) {
                pushed = true;
                if (bodyBuffer && bodyBuffer.length) this.push(bodyBuffer);
            }
            this.push(null);
        }
    });

    req.method = request.method;
    req.url = url.pathname + url.search;
    req.originalUrl = req.url;
    req.headers = headers;
    req.rawHeaders = Object.entries(headers).flat();
    req.httpVersion = '1.1';
    req.httpVersionMajor = 1;
    req.httpVersionMinor = 1;
    req.complete = true;
    const remoteAddress = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
    req.socket = { remoteAddress: String(remoteAddress).split(',')[0].trim(), remotePort: 0 };
    req.connection = req.socket;
    return req;
}

function toNodeRes() {
    const headerMap = new Map(); // lowercase name -> { name, values: string[] }
    const chunks = [];
    const res = {
        statusCode: 200,
        headersSent: false,
        finished: false,
        writableEnded: false,
        locals: {},
        req: null,
        _headerMap: headerMap,
        _chunks: chunks,
        _onfinish: null,
        setHeader(name, value) {
            headerMap.set(String(name).toLowerCase(), {
                name: String(name),
                values: (Array.isArray(value) ? value : [value]).map(String)
            });
            return res;
        },
        getHeader(name) {
            const h = headerMap.get(String(name).toLowerCase());
            if (!h) return undefined;
            return h.values.length === 1 ? h.values[0] : h.values.slice();
        },
        getHeaders() {
            const out = {};
            for (const h of headerMap.values()) out[h.name] = h.values.length === 1 ? h.values[0] : h.values.slice();
            return out;
        },
        getHeaderNames() {
            return Array.from(headerMap.values()).map(h => h.name);
        },
        hasHeader(name) {
            return headerMap.has(String(name).toLowerCase());
        },
        removeHeader(name) {
            headerMap.delete(String(name).toLowerCase());
        },
        writeHead(status, headersObj) {
            if (typeof status === 'number') res.statusCode = status;
            if (headersObj && typeof headersObj === 'object') {
                for (const [k, v] of Object.entries(headersObj)) res.setHeader(k, v);
            }
            res.headersSent = true;
            return res;
        },
        write(chunk) {
            if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            return true;
        },
        end(chunk) {
            if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            res.headersSent = true;
            res.finished = true;
            res.writableEnded = true;
            if (typeof res._onfinish === 'function') res._onfinish();
            return res;
        },
        flushHeaders() { res.headersSent = true; },
        setTimeout() { return res; },
        destroy() { res.finished = true; if (typeof res._onfinish === 'function') res._onfinish(); }
    };
    return res;
}

/**
 * Run an Express app against a Fetch Request and return a Fetch Response.
 */
async function handleWithExpress(app, request) {
    const bodyBuffer = Buffer.from(await request.arrayBuffer());
    const req = toNodeReq(request, bodyBuffer);
    const res = toNodeRes();
    req.res = res;
    res.req = req;

    await new Promise((resolve) => {
        let settled = false;
        const settle = () => { if (!settled) { settled = true; resolve(); } };
        res._onfinish = settle;
        req.on('error', settle);
        const done = (err) => {
            // Called by express when no route matched (notFoundHandler normally
            // ends the response first, so this is just a safety net).
            if (!res.headersSent) {
                res.statusCode = err ? 500 : 404;
                res.setHeader('content-type', 'application/json; charset=utf-8');
                res.end(JSON.stringify(err ? { error: 'Internal server error' } : { error: 'Not found' }));
            }
            settle();
        };
        try {
            app.handle(req, res, done);
        } catch (err) {
            done(err);
        }
    });

    const headers = new Headers();
    for (const h of res._headerMap.values()) {
        for (const v of h.values) headers.append(h.name, v);
    }
    const body = Buffer.concat(res._chunks);
    const canHaveBody = res.statusCode !== 204 && res.statusCode !== 304 && request.method !== 'HEAD';
    return new Response(canHaveBody && body.length ? body : null, {
        status: res.statusCode,
        headers
    });
}

module.exports = { handleWithExpress, toNodeReq, toNodeRes };
