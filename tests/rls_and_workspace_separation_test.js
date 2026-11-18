// ==========================================================================
// Step 4 Verification: Row-Level Security (RLS) & Workspace Isolation Test
// ==========================================================================

const assert = require('assert');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');
const {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY,
    PORT = 5000
} = require('../config/env');

const BASE_URL = `http://127.0.0.1:${PORT}`;

function request(method, path, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                let parsed = data;
                try { parsed = JSON.parse(data); } catch (_) {}
                resolve({ status: res.statusCode, headers: res.headers, body: parsed });
            });
        });

        req.on('error', reject);
        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

const post = (path, body, token) => request('POST', path, token ? { Authorization: `Bearer ${token}` } : {}, body);
const get = (path, token) => request('GET', path, token ? { Authorization: `Bearer ${token}` } : {});

async function runStage4Tests() {
    console.log('--- Starting Step 4: RLS & Workspace Separation Test Suite ---');

    // 1. Check direct Supabase client access with ANON key vs SERVICE_ROLE key
    if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'your-supabase-anon-key') {
        const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        console.log('🔒 Testing anonymous direct access lockdown via public Supabase API...');
        
        // Anon should not read sensitive admin users
        const { data: adminRows, error: adminErr } = await anonClient.from('admin_users').select('*');
        assert(adminErr || !adminRows || adminRows.length === 0, 'Anon client must not be able to read admin_users');
        console.log('✅ Anonymous access to admin_users blocked / empty under RLS');

        // Anon should not read audit logs
        const { data: auditRows, error: auditErr } = await anonClient.from('audit_logs').select('*');
        assert(auditErr || !auditRows || auditRows.length === 0, 'Anon client must not be able to read audit_logs');
        console.log('✅ Anonymous access to audit_logs blocked / empty under RLS');

        // Anon should not read campaigns
        const { data: campRows, error: campErr } = await anonClient.from('campaigns').select('*');
        assert(campErr || !campRows || campRows.length === 0, 'Anon client must not be able to read campaigns');
        console.log('✅ Anonymous access to campaigns blocked / empty under RLS');

        // Service role can query operational data
        const { data: serviceOrgs, error: serviceErr } = await serviceClient.from('organizations').select('id').limit(1);
        assert(!serviceErr, 'Backend service_role must be able to query organizations');
        console.log('✅ Backend service_role operates with verified authorization');
    } else {
        console.log('⚠️ Skipping direct Supabase anon tests (Supabase credentials not configured in test env).');
    }

    // 2. Multi-Tenant Workspace Isolation: Agency A vs Agency B
    console.log('🏢 Testing multi-tenant workspace isolation across agencies...');
    const now = Date.now();
    const agencyAEmail = `agency_a_${now}@test.com`;
    const agencyBEmail = `agency_b_${now}@test.com`;

    // Register Agency A
    const regA = await post('/api/auth/signup', {
        name: 'Agency Alpha Owner',
        email: agencyAEmail,
        password: 'Password123!',
        role: 'agency',
        organizationName: 'Alpha Media Agency'
    });
    assert.strictEqual(regA.status, 201, 'Agency A registration failed');
    const tokenA = regA.body.token;

    // Register Agency B
    const regB = await post('/api/auth/signup', {
        name: 'Agency Beta Owner',
        email: agencyBEmail,
        password: 'Password123!',
        role: 'agency',
        organizationName: 'Beta Talent Agency'
    });
    assert.strictEqual(regB.status, 201, 'Agency B registration failed');
    const tokenB = regB.body.token;

    // Get Agency A's workspace
    const wsA = await get('/api/collaboration/workspace', tokenA);
    assert.strictEqual(wsA.status, 200);
    const orgAId = wsA.body.organizations[0].id;

    // Agency A creates Campaign Alpha
    const createCamp = await post('/api/collaboration/campaigns', {
        organizationId: orgAId,
        name: 'Alpha Confidential Campaign',
        brief: 'Alpha secret campaign brief',
        fixedFee: 25000
    }, tokenA);
    assert.strictEqual(createCamp.status, 201, 'Failed to create Alpha campaign');
    const campaignAlphaId = createCamp.body.campaign.id;
    console.log(`✅ Agency A created isolated campaign: ${campaignAlphaId}`);

    // Agency B checks workspace: Campaign Alpha must NOT be in Agency B's workspace
    const wsB = await get('/api/collaboration/workspace', tokenB);
    assert.strictEqual(wsB.status, 200);
    const bCampaigns = wsB.body.campaigns || [];
    assert(!bCampaigns.some(c => c.id === campaignAlphaId), 'Agency B MUST NOT see Agency A campaigns in workspace');
    console.log('✅ Agency B workspace is isolated from Agency A campaigns');

    // Agency B attempts to directly read Campaign Alpha
    const bDirectRead = await get(`/api/collaboration/campaigns/${encodeURIComponent(campaignAlphaId)}`, tokenB);
    assert.strictEqual(bDirectRead.status, 404, 'Agency B direct read of Agency A campaign must return 404 Not Found');
    console.log('✅ Agency B direct read of Agency A campaign correctly rejected (HTTP 404)');

    // Agency B attempts to create deliverable on Campaign Alpha
    const bDeliverableAttempt = await post(`/api/collaboration/campaigns/${encodeURIComponent(campaignAlphaId)}/deliverables`, {
        title: 'Unauthorized Deliverable',
        platform: 'Instagram'
    }, tokenB);
    assert.strictEqual(bDeliverableAttempt.status, 404, 'Agency B deliverable injection must return 404');
    console.log('✅ Agency B deliverable mutation on Campaign Alpha correctly blocked (HTTP 404)');

    // 3. Clean Real User Workspace (Zero Seed Data Bleed)
    console.log('👤 Testing clean real creator workspace (no seed data bleed)...');
    const cleanCreatorEmail = `clean_creator_${now}@test.com`;
    const regCreator = await post('/api/auth/signup', {
        name: 'Fresh Real Creator',
        email: cleanCreatorEmail,
        password: 'Password123!',
        role: 'creator'
    });
    assert.strictEqual(regCreator.status, 201, 'Creator registration failed');
    const creatorToken = regCreator.body.token;

    // Fetch transactions for newly registered creator
    const creatorTxs = await get('/api/transactions', creatorToken);
    assert.strictEqual(creatorTxs.status, 200);
    assert(Array.isArray(creatorTxs.body.transactions), 'Transactions must be an array');
    assert.strictEqual(creatorTxs.body.transactions.length, 0, 'Fresh creator workspace MUST start with 0 transactions (not seed data)');
    console.log('✅ Fresh creator starts with clean empty ledger (0 seed transactions)');

    // Creator adds their own real transaction
    const newTx = await post('/api/transactions', {
        date: 'Nov 04',
        source: 'Brand Deals',
        merchant: 'Discovery Bank Sponsorship',
        type: 'income',
        category: 'Brand Deals',
        taxStatus: 'Taxable Income',
        amount: 8500
    }, creatorToken);
    assert(newTx.status === 200 || newTx.status === 201, 'Failed to add real transaction');

    // Verify creator now has exactly 1 transaction
    const updatedTxs = await get('/api/transactions', creatorToken);
    assert.strictEqual(updatedTxs.body.transactions.length, 1);
    assert.strictEqual(updatedTxs.body.transactions[0].merchant, 'Discovery Bank Sponsorship');
    console.log('✅ Fresh creator successfully tracks real transaction without seed interference');

    // Verify other users (Agency B) cannot see creator\'s transactions
    const bCheckCreatorTxs = await get('/api/transactions', tokenB);
    assert.strictEqual(bCheckCreatorTxs.status, 200);
    assert(!bCheckCreatorTxs.body.transactions.some(t => t.merchant === 'Discovery Bank Sponsorship'), 'Agency B must not see Creator C transactions');
    console.log('✅ Transaction ledger isolation verified across tenants');

    console.log('\n🎉 ALL STEP 4 RLS & WORKSPACE SEPARATION TESTS PASSED SUCCESSFULLY! 🎉');
}

runStage4Tests().catch(err => {
    console.error('❌ Step 4 Test failed:', err);
    process.exit(1);
});
