'use strict';
// ==========================================================================
// Creator Cash Flow - Cloudflare Worker entry point.
//   /api/*            -> Express app (adapter), backed by D1
//   cron triggers     -> automation v1 (Phase 3)
//   everything else   -> static assets via the ASSETS binding; extensionless
//                        paths fall back to "<path>.html" for page routes
// ==========================================================================

const { handleWithExpress } = require('./expressAdapter');

let expressAppPromise = null;

async function getExpressApp(env) {
    if (!expressAppPromise) {
        expressAppPromise = (async () => {
            // Bindings must be visible before server.js (and services/supabase.js)
            // are required, so the D1 client is picked up at module load.
            globalThis.__CCF_D1__ = env.DB;
            globalThis.__CCF_KV__ = env.KV;
            globalThis.__CCF_R2__ = env.ASSETS_BUCKET;
            globalThis.__CCF_ASSETS__ = env.ASSETS;
            // config/env.js and controllers read process.env; surface string
            // bindings (vars + secrets) there before the app modules load.
            for (const [key, value] of Object.entries(env)) {
                if (typeof value === 'string' && process.env[key] === undefined) {
                    process.env[key] = value;
                }
            }
            const { app } = require('../server');
            return app;
        })().catch((err) => {
            expressAppPromise = null;
            throw err;
        });
    }
    return expressAppPromise;
}

// Never expose server code, config, or local-only directories as assets.
const BLOCKED_PATH = /^\/(server\.js|package(-lock)?\.json|node_modules|worker|tests?|tmp|uploads|tasks|Dockerfile|[^/]*\.md|\.[^/]+)(\/|$)/;

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;

        // Fire-and-forget promises (e.g. emails) must survive the response:
        // register them with waitUntil or the isolate freezes before they finish.
        globalThis.__CCF_WAITUNTIL__ = (p) => { try { ctx.waitUntil(p); } catch (_) {} };

        if (BLOCKED_PATH.test(path)) {
            return new Response('Not found', { status: 404 });
        }

        if (path.startsWith('/api/')) {
            try {
                const app = await getExpressApp(env);
                return await handleWithExpress(app, request);
            } catch (err) {
                console.error('worker_error', err);
                return new Response(JSON.stringify({ error: 'internal_error' }), {
                    status: 500,
                    headers: { 'content-type': 'application/json' }
                });
            }
        }

        // R2 object storage serving (uploaded campaign assets). In production a
        // custom domain can front this later; the worker route works everywhere.
        if (path.startsWith('/assets-r2/')) {
            const key = decodeURIComponent(path.slice('/assets-r2/'.length));
            if (!key || key.includes('..')) return new Response('Not found', { status: 404 });
            const object = await env.ASSETS_BUCKET.get(key);
            if (!object) return new Response('Not found', { status: 404 });
            const headers = new Headers();
            object.writeHttpMetadata(headers);
            if (!headers.has('content-type')) headers.set('content-type', 'application/octet-stream');
            headers.set('cache-control', 'public, max-age=31536000, immutable');
            return new Response(request.method === 'HEAD' ? null : object.body, { headers });
        }

        // Static assets (html/css/js/png/...). With the default assets-first
        // behavior this handler only runs when no asset matched directly.
        let resp = await env.ASSETS.fetch(request);
        if (resp.status === 404 && !/\.[a-z0-9]+$/i.test(path)) {
            const htmlPath = path === '/' ? '/index.html' : path.replace(/\/+$/, '') + '.html';
            resp = await env.ASSETS.fetch(new Request(new URL(htmlPath, url.origin).toString(), { method: 'GET' }));
        }
        return resp;
    },

    async scheduled(event, env, ctx) {
        ctx.waitUntil((async () => {
            console.log('[cron] fired at', new Date(event.scheduledTime).toISOString(), 'cron:', event.cron);
            globalThis.__CCF_D1__ = env.DB;
            globalThis.__CCF_KV__ = env.KV;
            globalThis.__CCF_R2__ = env.ASSETS_BUCKET;
            const { runCronJobs } = require('./cron');
            await runCronJobs(env);
        })().catch((err) => console.error('[cron] run failed:', err)));
    }
};
