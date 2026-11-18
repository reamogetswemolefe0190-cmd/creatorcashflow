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

        if (BLOCKED_PATH.test(path)) {
            return new Response('Not found', { status: 404 });
        }

        if (path.startsWith('/api/')) {
            const app = await getExpressApp(env);
            return handleWithExpress(app, request);
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
            // Phase 3 (automation v1) hooks in here: invitation expiry sweep,
            // due-date nudges, report-on-publish. Kept a no-op until then.
        })());
    }
};
