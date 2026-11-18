// ==========================================================================
// Creator Cash Flow - Bounded Sliding-Window Rate Limiting Middleware
// Active TTL unreferenced cleanup timers and strict IP capacity caps
// ==========================================================================

// In-memory sliding-window tracker for admin login attempts (node runtime).
// Inside the Cloudflare Worker (globalThis.__CCF_KV__ set) the limiters below
// delegate to KV instead; this Map stays exported for health reporting/tests.
const adminLoginAttempts = new Map();

// ---------------------------------------------------------------------------
// KV-backed sliding-window store (Worker runtime). KV TTL handles expiry, so
// no cleanup timers are needed there. Fail-open on KV errors (logged).
// ---------------------------------------------------------------------------
let kvScopeCounter = 0;
function kvKey(scope, key) {
    return `rl:${scope}:${key}`;
}
async function kvGetTimestamps(kv, scope, key) {
    const raw = await kv.get(kvKey(scope, key), 'text');
    if (!raw) return [];
    try {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch (_) {
        return [];
    }
}
async function kvHit(kv, scope, key, windowMs, maxRequests, req, res, errorMessage, userFacingMessage) {
    const now = Date.now();
    let timestamps = (await kvGetTimestamps(kv, scope, key)).filter(t => now - t < windowMs);
    if (timestamps.length >= maxRequests) {
        const retryAfterSecs = Math.max(1, Math.ceil((timestamps[0] + windowMs - now) / 1000));
        res.setHeader('Retry-After', retryAfterSecs);
        res.status(429).json({
            error: errorMessage,
            message: `${userFacingMessage} Please try again after ${retryAfterSecs} seconds.`,
            retryAfterSeconds: retryAfterSecs
        });
        return false;
    }
    timestamps.push(now);
    await kv.put(kvKey(scope, key), JSON.stringify(timestamps), {
        expirationTtl: Math.max(60, Math.ceil(windowMs / 1000))
    });
    return true;
}
function kvAdminLoginLimiter(req, res, next) {
    const kv = globalThis.__CCF_KV__;
    kvHit(kv, 'admin-login', getClientIp(req), 15 * 60 * 1000, 5, req, res,
        'Too many login attempts',
        'Rate limit exceeded. Too many login attempts from this IP.')
        .then(ok => { if (ok) next(); })
        .catch(err => { console.warn('[RATE LIMIT] KV error, failing open:', err.message); next(); });
}
function createKvLimiter({ windowMs, maxRequests, errorMessage, userFacingMessage, keyGenerator }) {
    const scope = 'lim' + (++kvScopeCounter);
    return function limiter(req, res, next) {
        const kv = globalThis.__CCF_KV__;
        kvHit(kv, scope, keyGenerator(req), windowMs, maxRequests, req, res, errorMessage, userFacingMessage)
            .then(ok => { if (ok) next(); })
            .catch(err => { console.warn('[RATE LIMIT] KV error, failing open:', err.message); next(); });
    };
}

// Reliable client IP extraction prioritizing reverse proxy headers
function getClientIp(req) {
    if (!req) return '127.0.0.1';
    let forwarded = req.headers?.['x-forwarded-for'];
    if (Array.isArray(forwarded)) {
        forwarded = forwarded[0];
    }
    if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

// Active background TTL cleanup for admin login attempts (unref so tests exit cleanly)
const adminLoginCleanupTimer = setInterval(() => {
    const now = Date.now();
    const WINDOW_MS = 15 * 60 * 1000;
    for (const [key, timestamps] of adminLoginAttempts.entries()) {
        const valid = timestamps.filter(t => now - t < WINDOW_MS);
        if (valid.length === 0) {
            adminLoginAttempts.delete(key);
        } else if (valid.length !== timestamps.length) {
            adminLoginAttempts.set(key, valid);
        }
    }
}, 30000);

if (adminLoginCleanupTimer.unref) {
    adminLoginCleanupTimer.unref();
}

/**
 * Specialized rate limiter for administrative login endpoint
 * 5 attempts per 15-minute sliding window, max 1000 tracked IPs
 */
function rateLimitAdminLogin(req, res, next) {
    if (globalThis.__CCF_KV__) return kvAdminLoginLimiter(req, res, next);
    const ip = getClientIp(req);
    const now = Date.now();
    const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
    const MAX_ATTEMPTS = 5;
    const MAX_TRACKED_IPS = 1000; // Bounded capacity

    let attempts = adminLoginAttempts.get(ip) || [];
    attempts = attempts.filter(timestamp => now - timestamp < WINDOW_MS);

    if (attempts.length === 0) {
        adminLoginAttempts.delete(ip);
    } else {
        adminLoginAttempts.set(ip, attempts);
    }

    if (attempts.length >= MAX_ATTEMPTS) {
        const oldestAttempt = attempts[0];
        const retryAfterSecs = Math.max(1, Math.ceil((oldestAttempt + WINDOW_MS - now) / 1000));
        res.setHeader('Retry-After', retryAfterSecs);
        return res.status(429).json({
            error: 'Too many login attempts',
            message: `Rate limit exceeded. Too many login attempts from this IP. Please try again after ${retryAfterSecs} seconds.`,
            retryAfterSeconds: retryAfterSecs
        });
    }

    attempts.push(now);
    adminLoginAttempts.set(ip, attempts);

    // Evict oldest IP key if tracking map exceeds maximum capacity
    if (adminLoginAttempts.size > MAX_TRACKED_IPS) {
        const oldestKey = adminLoginAttempts.keys().next().value;
        adminLoginAttempts.delete(oldestKey);
    }

    next();
}

/**
 * Bounded sliding-window rate limiter factory with active TTL cleanup
 */
function createSlidingWindowLimiter({
    windowMs,
    maxRequests,
    errorMessage = 'Too many requests',
    userFacingMessage = 'Rate limit exceeded. Please try again later.',
    keyGenerator = (req) => getClientIp(req),
    maxTrackedKeys = 1000
}) {
    if (globalThis.__CCF_KV__) {
        return createKvLimiter({ windowMs, maxRequests, errorMessage, userFacingMessage, keyGenerator });
    }
    const tracker = new Map();

    const cleanupTimer = setInterval(() => {
        const now = Date.now();
        for (const [key, timestamps] of tracker.entries()) {
            const valid = timestamps.filter(t => now - t < windowMs);
            if (valid.length === 0) {
                tracker.delete(key);
            } else if (valid.length !== timestamps.length) {
                tracker.set(key, valid);
            }
        }
    }, Math.min(windowMs, 30000));

    if (cleanupTimer.unref) {
        cleanupTimer.unref();
    }

    const limiter = (req, res, next) => {
        const key = keyGenerator(req);
        const now = Date.now();

        let timestamps = tracker.get(key) || [];
        timestamps = timestamps.filter(t => now - t < windowMs);

        if (timestamps.length >= maxRequests) {
            const oldest = timestamps[0];
            const retryAfterSecs = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
            res.setHeader('Retry-After', retryAfterSecs);
            return res.status(429).json({
                error: errorMessage,
                message: `${userFacingMessage} Please try again after ${retryAfterSecs} seconds.`,
                retryAfterSeconds: retryAfterSecs
            });
        }

        timestamps.push(now);
        tracker.set(key, timestamps);

        if (tracker.size > maxTrackedKeys) {
            const oldestKey = tracker.keys().next().value;
            tracker.delete(oldestKey);
        }

        next();
    };

    limiter.tracker = tracker;
    limiter.reset = () => tracker.clear();
    limiter.destroy = () => clearInterval(cleanupTimer);
    return limiter;
}

// Endpoint-specific bounded rate limiters
const authRateLimiter = createSlidingWindowLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: process.env.NODE_ENV === 'test' ? 2000 : 60,
    errorMessage: 'Too many requests',
    userFacingMessage: 'Rate limit exceeded. Too many authentication attempts from this IP.',
    maxTrackedKeys: 1000
});

const transactionRateLimiter = createSlidingWindowLimiter({
    windowMs: 60 * 1000,
    maxRequests: 60,
    errorMessage: 'Too many requests',
    userFacingMessage: 'Rate limit exceeded. Too many transaction operations.',
    keyGenerator: (req) => req.user?.id || getClientIp(req),
    maxTrackedKeys: 2000
});

const adminMutationRateLimiter = createSlidingWindowLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30,
    errorMessage: 'Too many requests',
    userFacingMessage: 'Rate limit exceeded. Too many administrative mutations.',
    keyGenerator: (req) => req.admin?.id || getClientIp(req),
    maxTrackedKeys: 500
});

const geminiRateLimiter = createSlidingWindowLimiter({
    windowMs: 60 * 1000,
    maxRequests: 15,
    errorMessage: 'Too many requests',
    userFacingMessage: 'Rate limit exceeded. Too many AI queries from this IP.',
    maxTrackedKeys: 500
});

module.exports = {
    adminLoginAttempts,
    getClientIp,
    rateLimitAdminLogin,
    createSlidingWindowLimiter,
    authRateLimiter,
    transactionRateLimiter,
    adminMutationRateLimiter,
    geminiRateLimiter
};
