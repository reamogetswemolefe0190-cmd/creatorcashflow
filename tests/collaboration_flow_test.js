'use strict';

process.env.NODE_ENV = 'test';
process.env.PORT = '5058';
const assert = require('assert');
const { app } = require('../server');
const server = app.listen(5058, '127.0.0.1');

async function request(path, token, body) {
    const response = await fetch(`http://127.0.0.1:5058${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: response.status, body: await response.json() };
}

async function signup(name, email, role = 'creator', organizationName = '') {
    const result = await request('/api/auth/signup', null, { name, email, password: 'Valid-test-password-42', role, organization_name: organizationName });
    assert.equal(result.status, 201);
    return result.body;
}

(async () => {
    const stamp = Date.now();
    const manager = await signup('Agency Manager', `manager-${stamp}@example.com`);
    const creator = await signup('Campaign Creator', `creator-${stamp}@example.com`);
    const outsider = await signup('Other Agency', `outsider-${stamp}@example.com`);
    const brandUser = await signup('Brand Reviewer', `brand-${stamp}@example.com`, 'brand', 'Vela Brand');

    const organizationResult = await request('/api/collaboration/organizations', manager.token, { name: 'Studio North', type: 'agency' });
    assert.equal(organizationResult.status, 201);
    const organization = organizationResult.body.organization;
    const brandWorkspace = await request('/api/collaboration/workspace', brandUser.token);
    const brandOrganization = brandWorkspace.body.organizations.find(org => org.type === 'brand');
    assert.ok(brandOrganization);

    const invite = await request(`/api/collaboration/organizations/${organization.id}/invitations`, manager.token, { email: `creator-${stamp}@example.com`, role: 'creator' });
    assert.equal(invite.status, 201);
    assert.equal(invite.body.invitation.status, 'pending');

    const campaignResult = await request('/api/collaboration/campaigns', manager.token, { organizationId: organization.id, name: 'Vela Summer Launch', brief: 'Two Reels and three Stories', fixedFee: 20000 });
    assert.equal(campaignResult.status, 201);
    const campaign = campaignResult.body.campaign;
    assert.equal((await request(`/api/collaboration/campaigns/${campaign.id}`, brandUser.token)).status, 404);
    const accessRequest = await request(`/api/collaboration/campaigns/${campaign.id}/brand-request`, manager.token, { brandOrganizationId: brandOrganization.id });
    assert.equal(accessRequest.status, 201);
    assert.equal(accessRequest.body.delivery, 'in_app_only');
    const pendingBrands = await request('/api/collaboration/brand-requests', brandUser.token);
    assert.equal(pendingBrands.body.requests.length, 1);
    assert.equal((await request(`/api/collaboration/brand-requests/${accessRequest.body.request.id}/respond`, outsider.token, { decision: 'accepted' })).status, 404);
    assert.equal((await request(`/api/collaboration/brand-requests/${accessRequest.body.request.id}/respond`, brandUser.token, { decision: 'accepted' })).status, 200);

    const assignmentResult = await request(`/api/collaboration/campaigns/${campaign.id}/creators`, manager.token, { email: `creator-${stamp}@example.com` });
    assert.equal(assignmentResult.status, 201);
    assert.equal(assignmentResult.body.assignment.data_scope.income, false);

    const messagePath = `/api/collaboration/campaigns/${campaign.id}/messages`;
    assert.equal((await request(messagePath, outsider.token)).status, 404);
    assert.equal((await request(messagePath, outsider.token, { content: 'Unauthorized' })).status, 404);
    assert.equal((await request(messagePath, creator.token)).status, 404);

    const creatorWorkspace = await request('/api/collaboration/workspace', creator.token);
    assert.equal(creatorWorkspace.status, 200);
    assert.equal(creatorWorkspace.body.assignments.length, 1);
    assert.equal(creatorWorkspace.body.campaigns[0].fixed_fee, null);

    const acceptance = await request(`/api/collaboration/campaigns/${campaign.id}/accept`, creator.token, { audience: true });
    assert.equal(acceptance.status, 200);
    assert.equal(acceptance.body.assignment.consent_status, 'accepted');
    assert.equal(acceptance.body.assignment.data_scope.income, false);
    assert.equal((await request(messagePath, creator.token, { content: 'Ready to work' })).status, 201);
    const messages = await request(messagePath, manager.token);
    assert.equal(messages.status, 200);
    assert.equal(messages.body.messages.length, 1);
    assert.equal(messages.body.messages[0].content, 'Ready to work');

    const workflowPath = `/api/collaboration/campaigns/${campaign.id}`;
    assert.equal((await request(workflowPath, outsider.token)).status, 404);
    assert.equal((await request(workflowPath, brandUser.token)).status, 200);
    const created = await request(`${workflowPath}/deliverables`, manager.token, { title: 'Launch Reel', platform: 'Instagram', creatorUserId: creator.userId });
    assert.equal(created.status, 201);
    const deliverableId = created.body.deliverable.id;
    const transitionPath = `${workflowPath}/deliverables/${deliverableId}/transition`;
    const metricPath = `${workflowPath}/deliverables/${deliverableId}/metrics`;
    assert.equal((await request(metricPath, creator.token, { metricName: 'views', metricValue: 10 })).status, 409);
    assert.equal((await request(transitionPath, outsider.token, { action: 'approve' })).status, 404);
    assert.equal((await request(transitionPath, creator.token, { action: 'submit', contentUrl: 'http://invalid.example/post' })).status, 400);
    assert.equal((await request(transitionPath, creator.token, { action: 'submit', contentUrl: 'https://example.com/draft' })).status, 200);
    assert.equal((await request(transitionPath, brandUser.token, { action: 'request_revision', note: 'Please change the opening shot.' })).status, 200);
    assert.equal((await request(transitionPath, creator.token, { action: 'submit', contentUrl: 'https://example.com/draft-v2' })).status, 200);
    assert.equal((await request(transitionPath, brandUser.token, { action: 'approve' })).status, 200);
    assert.equal((await request(transitionPath, creator.token, { action: 'publish', contentUrl: 'https://example.com/published' })).status, 200);
    assert.equal((await request(metricPath, outsider.token, { metricName: 'views', metricValue: 999 })).status, 404);
    assert.equal((await request(metricPath, brandUser.token, { metricName: 'views', metricValue: 999 })).status, 403);
    const manualResult = await request(metricPath, creator.token, { metricName: 'views', metricValue: 123 });
    assert.equal(manualResult.status, 201);
    assert.equal(manualResult.body.verification, 'self_reported');
    const workflow = await request(workflowPath, brandUser.token);
    assert.equal(workflow.body.deliverables[0].status, 'published');
    assert.equal(workflow.body.events.length, 6);
    assert.equal(workflow.body.metrics[0].provider, 'manual');
    assert.equal((await request(workflowPath, creator.token)).body.campaign.fixed_fee, null);

    const milestone = await request(`/api/collaboration/campaigns/${campaign.id}/milestones`, manager.token, { name: '250k verified views', metricName: 'views', targetValue: 250000, bonusAmount: 5000 });
    assert.equal(milestone.status, 201);
    assert.equal(milestone.body.milestone.status, 'tracking');

    const forbidden = await request('/api/collaboration/campaigns', creator.token, { organizationId: organization.id, name: 'Not allowed' });
    assert.equal(forbidden.status, 403);

    console.log('COLLABORATION_FLOW_RESULTS', JSON.stringify({ passed: 51, failed: 0 }));
    server.close();
})().catch(error => {
    console.error(error);
    server.close(() => process.exit(1));
});
