'use strict';
// ==========================================================================
// App-level authorization tests — replaces the Supabase RLS test after the
// Cloudflare migration. Authorization now lives in app code (canAccessCampaign,
// requireManager, consent checks), so these tests assert cross-workspace
// isolation against the same code paths the Worker runs on D1.
// Run: NODE_ENV=test node tests/app_level_authz_test.js
// ==========================================================================

process.env.NODE_ENV = 'test';
process.env.PORT = '5099';
const assert = require('assert');
const { app } = require('../server');
const server = app.listen(5099, '127.0.0.1');
server.on('listening', () => {});

async function waitReady() {
    for (let i = 0; i < 50; i++) {
        try {
            const r = await fetch('http://127.0.0.1:5099/api/health');
            if (r.ok) return;
        } catch (_) {}
        await new Promise(r => setTimeout(r, 100));
    }
    throw new Error('server did not start');
}

async function request(path, token, body) {
    const response = await fetch(`http://127.0.0.1:5099${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    let json = null;
    try { json = await response.json(); } catch (_) {}
    return { status: response.status, body: json };
}

async function signup(name, email, role = 'creator', organizationName = '') {
    const result = await request('/api/auth/signup', null, { name, email, password: 'Valid-test-password-42', role, organization_name: organizationName });
    assert.equal(result.status, 201);
    return result.body;
}

(async () => {
    await waitReady();
    const stamp = Date.now();
    let passed = 0;
    const ok = (name, cond) => { assert.ok(cond, name); passed++; console.log('PASS', name); };

    const managerA = await signup('Manager A', `mgr-a-${stamp}@example.com`, 'agency', 'Agency A');
    const managerB = await signup('Manager B', `mgr-b-${stamp}@example.com`, 'agency', 'Agency B');
    const creator = await signup('Creator', `creator-${stamp}@example.com`);
    const stranger = await signup('Stranger', `stranger-${stamp}@example.com`);

    const orgA = (await request('/api/collaboration/organizations', managerA.token, { name: 'Agency A Org', type: 'agency' })).body.organization;
    const orgB = (await request('/api/collaboration/organizations', managerB.token, { name: 'Agency B Org', type: 'agency' })).body.organization;
    ok('both orgs created', orgA.id && orgB.id && orgA.id !== orgB.id);

    const campaign = (await request('/api/collaboration/campaigns', managerA.token, { organizationId: orgA.id, name: 'A Campaign', fixedFee: 9999 })).body.campaign;

    // cross-workspace isolation
    ok('manager B cannot read A campaign', (await request(`/api/collaboration/campaigns/${campaign.id}`, managerB.token)).status === 404);
    ok('stranger cannot read A campaign', (await request(`/api/collaboration/campaigns/${campaign.id}`, stranger.token)).status === 404);
    ok('stranger cannot list A messages', (await request(`/api/collaboration/campaigns/${campaign.id}/messages`, stranger.token)).status === 404);
    const delB = await request(`/api/collaboration/campaigns/${campaign.id}/deliverables`, managerB.token, { title: 'X', creatorUserId: creator.userId, platform: 'instagram' });
    ok('manager B cannot create deliverable in A campaign', delB.status === 403 || delB.status === 404);
    const asgB = await request(`/api/collaboration/campaigns/${campaign.id}/creators`, managerB.token, { email: `creator-${stamp}@example.com` });
    ok('manager B cannot assign creator to A campaign', asgB.status === 403 || asgB.status === 404);

    // consent gate: assigned but not accepted -> no access
    await request(`/api/collaboration/campaigns/${campaign.id}/creators`, managerA.token, { email: `creator-${stamp}@example.com` });
    ok('assigned-but-not-accepted creator blocked from campaign', (await request(`/api/collaboration/campaigns/${campaign.id}`, creator.token)).status === 404);
    ok('not-accepted creator cannot post message', (await request(`/api/collaboration/campaigns/${campaign.id}/messages`, creator.token, { content: 'hi' })).status === 404);

    // after accept -> access, but fee stays hidden from creator (data minimization)
    const acc = await request(`/api/collaboration/campaigns/${campaign.id}/accept`, creator.token, {});
    ok('accept works', acc.status === 200 && acc.body.assignment.consent_status === 'accepted');
    const ws = await request('/api/collaboration/workspace', creator.token);
    ok('creator workspace hides fixed fee', ws.body.campaigns[0].fixed_fee === null);
    ok('accepted creator can read campaign', (await request(`/api/collaboration/campaigns/${campaign.id}`, creator.token)).status === 200);
    ok('accepted creator can post message', (await request(`/api/collaboration/campaigns/${campaign.id}/messages`, creator.token, { content: 'ready' })).status === 201);

    // manager of A sees the fee
    const det = await request(`/api/collaboration/campaigns/${campaign.id}`, managerA.token);
    ok('manager sees own campaign with fee', det.status === 200 && det.body.campaign.fixed_fee === 9999);

    // workspace listing does not leak other orgs
    const wsB = await request('/api/collaboration/workspace', managerB.token);
    ok('workspace B has no campaign of A', (wsB.body.campaigns || []).every(c => c.id !== campaign.id));

    console.log(`\nAPP-LEVEL AUTHZ: ${passed}/${passed} passed`);
    server.close();
    process.exit(0);
})().catch(e => { console.error('AUTHZ TEST FAILED:', e.message); server.close(); process.exit(1); });
