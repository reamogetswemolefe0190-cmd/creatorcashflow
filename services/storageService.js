'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { supabase } = require('./supabase');

const BUCKET_NAME = 'campaign-assets';
const UPLOADS_DIR = typeof __dirname !== 'undefined' ? path.join(__dirname, '..', 'uploads') : '/uploads';

// Ensure local uploads directory exists for fallback (skipped inside the
// Cloudflare Worker, where the fs is unavailable; R2 handles uploads there)
const IS_WORKER = !!globalThis.__CCF_D1__;
if (!IS_WORKER && !fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Ensure Supabase bucket exists if connected
let bucketChecked = false;
async function ensureBucket() {
    if (!supabase || !supabase.storage || bucketChecked) return;
    try {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        if (error) {
            console.warn('[STORAGE] Warning listing buckets:', error.message);
            return;
        }
        const exists = (buckets || []).some(b => b.name === BUCKET_NAME || b.id === BUCKET_NAME);
        if (!exists) {
            const { error: createErr } = await supabase.storage.createBucket(BUCKET_NAME, { public: true });
            if (createErr) console.warn('[STORAGE] Bucket creation notice:', createErr.message);
            else console.log(`[STORAGE] Created '${BUCKET_NAME}' bucket in Supabase Storage`);
        }
        bucketChecked = true;
    } catch (err) {
        console.warn('[STORAGE] ensureBucket exception:', err.message);
    }
}
ensureBucket();

// Allowed MIME types for campaign media (videos, images, evidence screenshots, PDFs)
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'application/pdf'
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const uploadMiddleware = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
            const err = new Error('Unsupported file type. Please upload a valid image (JPG, PNG, WebP), video (MP4, MOV, WebM), or PDF document.');
            err.code = 'INVALID_FILE_TYPE';
            return cb(err, false);
        }
        cb(null, true);
    }
});

function sanitizeFileName(name) {
    return String(name || 'file')
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '_')
        .slice(0, 80);
}

/**
 * Upload an asset buffer. Order of backends:
 *   1. Cloudflare R2 (Worker runtime, globalThis.__CCF_R2__ set by worker entry)
 *   2. Supabase Storage (legacy node deployments with supabase configured)
 *   3. Local disk (node dev fallback)
 */
async function uploadAsset({ buffer, originalName, mimeType, folder = 'general' }) {
    await ensureBucket();
    const cleanExt = path.extname(originalName || '').toLowerCase() || '.bin';
    const cleanBase = sanitizeFileName(path.basename(originalName || 'asset', cleanExt));
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const storagePath = `${folder}/${Date.now()}_${randomSuffix}_${cleanBase}${cleanExt}`;

    // Cloudflare R2 (Worker runtime)
    if (globalThis.__CCF_R2__) {
        await globalThis.__CCF_R2__.put(storagePath, buffer, {
            httpMetadata: { contentType: mimeType || 'application/octet-stream' }
        });
        return {
            url: `/assets-r2/${storagePath}`,
            path: storagePath,
            storage: 'r2',
            size: buffer.length,
            mimeType,
            originalName
        };
    }

    if (supabase && supabase.storage) {
        try {
            const { data, error } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(storagePath, buffer, {
                    contentType: mimeType,
                    upsert: true
                });

            if (error) {
                console.warn('[STORAGE] Supabase upload failed, falling back to local storage:', error.message);
            } else {
                const { data: urlData } = supabase.storage
                    .from(BUCKET_NAME)
                    .getPublicUrl(storagePath);

                return {
                    url: urlData.publicUrl,
                    path: storagePath,
                    storage: 'supabase',
                    size: buffer.length,
                    mimeType,
                    originalName
                };
            }
        } catch (err) {
            console.warn('[STORAGE] Supabase upload exception:', err.message);
        }
    }

    // Local Disk Fallback (node dev only; Workers always have __CCF_R2__)
    if (IS_WORKER) {
        throw new Error('Asset storage is not configured in this runtime');
    }
    const localTargetDir = path.join(UPLOADS_DIR, folder);
    if (!fs.existsSync(localTargetDir)) {
        fs.mkdirSync(localTargetDir, { recursive: true });
    }
    const localFilePath = path.join(localTargetDir, `${Date.now()}_${randomSuffix}_${cleanBase}${cleanExt}`);
    fs.writeFileSync(localFilePath, buffer);

    const relativeUrl = `/uploads/${folder}/${path.basename(localFilePath)}`;
    return {
        url: relativeUrl,
        path: storagePath,
        storage: 'local',
        size: buffer.length,
        mimeType,
        originalName
    };
}

module.exports = {
    BUCKET_NAME,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE,
    uploadMiddleware,
    uploadAsset,
    ensureBucket
};
