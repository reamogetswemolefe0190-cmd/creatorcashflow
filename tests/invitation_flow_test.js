'use strict';

const assert = require('assert');
const http = require('http');

const BASE_URL = 'http://127.0.0.1:5000';

function post(path, body, token) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body || {});
        const url = new URL(path, BASE_URL);
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

function get(path, token) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
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

async function runTest() {
    console.log('--- Starting Invitation Flow Verification Test ---');

    // 1. Create/login as an agency manager
    const mgrEmail = `testagency_${Date.now()}@creatorcashflow.co.za`;
    const signupMgr = await post('/api/auth/signup', {
        name: 'Test Agency Owner',
        email: mgrEmail,
        password: 'Password123!',
        role: 'agency',
        organization_name: 'Apex Creator Agency'
    });
    assert.strictEqual(signupMgr.status, 201, `Failed to create agency: ${JSON.stringify(signupMgr.body)}`);
    const mgrToken = signupMgr.body.token;
    console.log('✅ Agency owner registered with organization');

    // 2. Fetch workspace to get organization id
    const ws = await get('/api/collaboration/workspace', mgrToken);
    assert.strictEqual(ws.status, 200);
    const orgId = ws.body.organizations[0].id;
    console.log(`✅ Loaded workspace organization: ${orgId}`);

    // 3. Send invitation
    const inviteeEmail = `invitee_${Date.now()}@creatorcashflow.co.za`;
    const inviteRes = await post(`/api/collaboration/organizations/${orgId}/invitations`, {
        email: inviteeEmail,
        role: 'creator'
    }, mgrToken);

    assert.strictEqual(inviteRes.status, 201, `Invite failed: ${JSON.stringify(inviteRes.body)}`);
    assert(inviteRes.body.invitation, 'Missing invitation object');
    assert(inviteRes.body.inviteUrl, 'Missing inviteUrl');
    const token = inviteRes.body.invitation.id;
    console.log(`✅ Invitation created with id ${token}, delivery: ${inviteRes.body.delivery}`);

    // 4. Public inspect of invitation (no auth token)
    const publicInspect = await get(`/api/collaboration/invitations/${encodeURIComponent(token)}`);
    assert.strictEqual(publicInspect.status, 200, `Public inspect failed: ${JSON.stringify(publicInspect.body)}`);
    assert.strictEqual(publicInspect.body.invitation.email, inviteeEmail);
    assert.strictEqual(publicInspect.body.invitation.status, 'pending');
    assert.strictEqual(publicInspect.body.invitation.role, 'creator');
    assert.strictEqual(publicInspect.body.organization.name, 'Apex Creator Agency');
    console.log('✅ Public invitation inspection verified successfully');

    // 5. Try to accept with mismatched user (should be 403 Forbidden)
    const wrongUserEmail = `wrong_${Date.now()}@creatorcashflow.co.za`;
    const wrongSignup = await post('/api/auth/signup', {
        name: 'Wrong User',
        email: wrongUserEmail,
        password: 'Password123!',
        role: 'creator'
    });
    const wrongToken = wrongSignup.body.token;
    const mismatchAccept = await post(`/api/collaboration/invitations/${encodeURIComponent(token)}/accept`, {}, wrongToken);
    assert.strictEqual(mismatchAccept.status, 403, 'Should reject mismatched email with 403');
    console.log('✅ Mismatched email security check passed (HTTP 403 Forbidden)');

    // 6. Sign up as the intended invitee
    const inviteeSignup = await post('/api/auth/signup', {
        name: 'Intended Invitee',
        email: inviteeEmail,
        password: 'Password123!',
        role: 'creator'
    });
    assert.strictEqual(inviteeSignup.status, 201);
    const inviteeToken = inviteeSignup.body.token;
    console.log('✅ Intended invitee registered');

    // 7. Accept invitation
    const acceptRes = await post(`/api/collaboration/invitations/${encodeURIComponent(token)}/accept`, {}, inviteeToken);
    assert.strictEqual(acceptRes.status, 200, `Accept failed: ${JSON.stringify(acceptRes.body)}`);
    assert.strictEqual(acceptRes.body.organizationId, orgId);
    console.log('✅ Invitation accepted successfully');

    // 8. Try to accept again (should be 400 Already Accepted)
    const repeatAccept = await post(`/api/collaboration/invitations/${encodeURIComponent(token)}/accept`, {}, inviteeToken);
    assert.strictEqual(repeatAccept.status, 400);
    console.log('✅ Re-acceptance properly rejected (HTTP 400)');

    // 9. Verify invitee is now an active member of the workspace
    const inviteeWs = await get('/api/collaboration/workspace', inviteeToken);
    assert.strictEqual(inviteeWs.status, 200);
    const isMember = inviteeWs.body.organizations.some(o => o.id === orgId);
    assert(isMember, 'Invitee should now see the organization in their workspace');
    console.log('✅ Invitee confirmed as active member in workspace data');

    // 10. List invitations from manager view
    const listRes = await get(`/api/collaboration/organizations/${orgId}/invitations`, mgrToken);
    assert.strictEqual(listRes.status, 200);
    const found = listRes.body.invitations.find(i => i.id === token);
    assert(found, 'Invitation should be listed in organization invitations');
    assert.strictEqual(found.status, 'accepted');
    console.log('✅ Manager can view organization invitations with updated status');

    console.log('\n🎉 ALL 10 INVITATION FLOW TESTS PASSED SUCCESSFULLY! 🎉');
}

runTest().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
