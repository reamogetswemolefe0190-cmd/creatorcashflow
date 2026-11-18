'use strict';

const assert = require('assert');
const http = require('http');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://127.0.0.1:5000';

function postJson(urlPath, body, token) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body || {});
        const url = new URL(urlPath, BASE_URL);
        const headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const req = http.request(url, { method: 'POST', headers }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

function get(urlPath, token) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlPath, BASE_URL);
        const headers = {};
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const req = http.request(url, { method: 'GET', headers }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

function postMultipart(urlPath, token, filename, mimeType, fileBuffer, fields = {}) {
    return new Promise((resolve, reject) => {
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        const url = new URL(urlPath, BASE_URL);

        let parts = [];
        for (const [key, val] of Object.entries(fields)) {
            parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`));
        }

        parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`));
        parts.push(fileBuffer);
        parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

        const body = Buffer.concat(parts);

        const headers = {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length
        };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const req = http.request(url, { method: 'POST', headers }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function runStorageTest() {
    console.log('--- Starting Storage & Deliverable Upload End-to-End Test ---');

    // 1. Direct Storage Service Test
    const { uploadAsset } = require('../services/storageService');
    const sampleBuffer = Buffer.from('FAKE_MP4_VIDEO_STREAM_DATA_FOR_CCF_VERIFICATION');
    const directUpload = await uploadAsset({
        buffer: sampleBuffer,
        originalName: 'test-reel-draft.mp4',
        mimeType: 'video/mp4',
        folder: 'test-direct'
    });
    assert(directUpload.url, 'uploadAsset should return a valid URL');
    assert.strictEqual(directUpload.mimeType, 'video/mp4');
    console.log(`✅ Direct storage upload verified: ${directUpload.url} (storage: ${directUpload.storage})`);

    // 2. Setup Agency and Creator Accounts
    const timestamp = Date.now();
    const agencyRes = await postJson('/api/auth/signup', {
        name: 'Starlight Agency',
        email: `agency_storage_${timestamp}@creatorcashflow.co.za`,
        password: 'Password123!',
        role: 'agency',
        organization_name: 'Starlight Media'
    });
    assert.strictEqual(agencyRes.status, 201);
    const agencyToken = agencyRes.body.token;

    const creatorRes = await postJson('/api/auth/signup', {
        name: 'Kagiso Creator',
        email: `creator_storage_${timestamp}@creatorcashflow.co.za`,
        password: 'Password123!',
        role: 'creator'
    });
    assert.strictEqual(creatorRes.status, 201);
    const creatorToken = creatorRes.body.token;
    const creatorUserId = creatorRes.body.userId;
    console.log('✅ Agency and Creator accounts provisioned');

    // 3. Agency creates campaign
    const ws = await get('/api/collaboration/workspace', agencyToken);
    const orgId = ws.body.organizations[0].id;
    const cmpRes = await postJson('/api/collaboration/campaigns', {
        organizationId: orgId,
        name: 'Spring Kinetic Campaign',
        brief: 'Deliver 1 x 30s TikTok video introducing spring fitness collection.',
        fixedFee: 15000
    }, agencyToken);
    assert.strictEqual(cmpRes.status, 201);
    const campaignId = cmpRes.body.campaign.id;
    console.log(`✅ Campaign created: ${campaignId}`);

    // 4. Assign creator & Creator accepts
    const assignRes = await postJson(`/api/collaboration/campaigns/${campaignId}/creators`, {
        email: `creator_storage_${timestamp}@creatorcashflow.co.za`
    }, agencyToken);
    assert.strictEqual(assignRes.status, 201);

    const acceptAssignment = await postJson(`/api/collaboration/campaigns/${campaignId}/accept`, {
        audience: false
    }, creatorToken);
    assert.strictEqual(acceptAssignment.status, 200);
    console.log('✅ Creator assigned and accepted campaign');

    // 5. Agency adds deliverable
    const delivRes = await postJson(`/api/collaboration/campaigns/${campaignId}/deliverables`, {
        title: 'TikTok Spring Reel 01',
        platform: 'TikTok',
        creatorUserId: creatorUserId
    }, agencyToken);
    assert.strictEqual(delivRes.status, 201);
    const deliverableId = delivRes.body.deliverable.id;
    assert.strictEqual(delivRes.body.deliverable.status, 'planned');
    console.log(`✅ Deliverable created: ${deliverableId} (status: planned)`);

    // 6. Creator uploads draft video via multipart endpoint
    const videoData = Buffer.from('FAKE_REEL_VIDEO_PAYLOAD_CHUNK');
    const uploadRes = await postMultipart(
        `/api/collaboration/campaigns/${campaignId}/deliverables/${deliverableId}/upload`,
        creatorToken,
        'my-hero-draft.mp4',
        'video/mp4',
        videoData,
        { assetType: 'draft' }
    );
    assert.strictEqual(uploadRes.status, 201, `Upload failed: ${JSON.stringify(uploadRes.body)}`);
    assert(uploadRes.body.asset.url, 'Upload response must include asset URL');
    const uploadedAssetUrl = uploadRes.body.asset.url;
    console.log(`✅ Draft video uploaded successfully via API: ${uploadedAssetUrl}`);

    // 7. Security: Unrelated user cannot upload to this deliverable
    const intruderRes = await postJson('/api/auth/signup', {
        name: 'Intruder User',
        email: `intruder_${timestamp}@creatorcashflow.co.za`,
        password: 'Password123!',
        role: 'creator'
    });
    const intruderUpload = await postMultipart(
        `/api/collaboration/campaigns/${campaignId}/deliverables/${deliverableId}/upload`,
        intruderRes.body.token,
        'malicious.mp4',
        'video/mp4',
        videoData
    );
    assert.strictEqual(intruderUpload.status, 404, 'Unrelated user must be blocked with 404/403');
    console.log('✅ Access control check passed (unauthorized user blocked)');

    // 8. Creator submits deliverable for review using the uploaded asset URL
    const submitTransition = await postJson(
        `/api/collaboration/campaigns/${campaignId}/deliverables/${deliverableId}/transition`,
        {
            action: 'submit',
            contentUrl: uploadedAssetUrl,
            note: 'Here is the first draft cut!'
        },
        creatorToken
    );
    assert.strictEqual(submitTransition.status, 200, `Submit failed: ${JSON.stringify(submitTransition.body)}`);
    assert.strictEqual(submitTransition.body.deliverable.status, 'submitted');
    assert.strictEqual(submitTransition.body.deliverable.content_url, uploadedAssetUrl);
    console.log('✅ Deliverable transitioned to "submitted" with uploaded media URL attached');

    // 9. Agency reviews deliverable and approves
    const campaignDetails = await get(`/api/collaboration/campaigns/${campaignId}`, agencyToken);
    assert.strictEqual(campaignDetails.status, 200);
    const targetDeliv = campaignDetails.body.deliverables.find(d => d.id === deliverableId);
    assert.strictEqual(targetDeliv.status, 'submitted');
    assert.strictEqual(targetDeliv.content_url, uploadedAssetUrl);

    const approveTransition = await postJson(
        `/api/collaboration/campaigns/${campaignId}/deliverables/${deliverableId}/transition`,
        { action: 'approve' },
        agencyToken
    );
    assert.strictEqual(approveTransition.status, 200);
    assert.strictEqual(approveTransition.body.deliverable.status, 'approved');
    console.log('✅ Agency reviewer verified uploaded asset and approved deliverable');

    // 10. Performance Evidence Screenshot Upload (PNG)
    const screenshotData = Buffer.from('FAKE_PNG_PERFORMANCE_SCREENSHOT_DATA');
    const screenshotUpload = await postMultipart(
        `/api/collaboration/campaigns/${campaignId}/deliverables/${deliverableId}/upload`,
        creatorToken,
        'insights_stats_30k.png',
        'image/png',
        screenshotData,
        { assetType: 'evidence' }
    );
    assert.strictEqual(screenshotUpload.status, 201);
    assert(screenshotUpload.body.asset.url.includes('.png'));
    console.log(`✅ Performance proof screenshot uploaded: ${screenshotUpload.body.asset.url}`);

    console.log('\n🎉 ALL 10 STORAGE & DELIVERABLE UPLOAD TESTS PASSED SUCCESSFULLY! 🎉');
}

runStorageTest().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
