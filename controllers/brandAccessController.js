'use strict';

const crypto = require('crypto');
const { supabase } = require('../services/supabase');
const { memoryDb } = require('../services/memoryDb');
const { sanitizeString } = require('../middleware/validation');
const { campaignById, membership } = require('./collaborationController');

const clean = value => sanitizeString(String(value || '')).trim().slice(0, 100);
const unavailable = res => process.env.NODE_ENV === 'production' && !supabase
    ? (res.status(503).json({ error: 'Brand access requests are temporarily unavailable.' }), true) : false;

async function orgById(id) {
    if (!supabase) return memoryDb.organizations.find(org => org.id === id) || null;
    const { data, error } = await supabase.from('organizations').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
}

async function requestById(id) {
    if (!supabase) return memoryDb.campaign_brand_requests.find(row => row.id === id) || null;
    const { data, error } = await supabase.from('campaign_brand_requests').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
}

async function listForOrg(orgId) {
    if (!supabase) return memoryDb.campaign_brand_requests.filter(row => row.brand_organization_id === orgId && row.status === 'pending');
    const { data, error } = await supabase.from('campaign_brand_requests').select('*').eq('brand_organization_id', orgId).eq('status', 'pending');
    if (error) throw error;
    return data || [];
}

async function listForCampaign(campaignId) {
    if (!supabase) return memoryDb.campaign_brand_requests.filter(row => row.campaign_id === campaignId && row.status === 'pending');
    const { data, error } = await supabase.from('campaign_brand_requests').select('*').eq('campaign_id', campaignId).eq('status', 'pending');
    if (error) throw error;
    return data || [];
}

async function write(table, row) {
    if (!supabase) { memoryDb[table].push(row); return row; }
    const { data, error } = await supabase.from(table).insert([row]).select().single();
    if (error) throw error;
    return data;
}

async function requestAccess(req, res) {
    if (unavailable(res)) return;
    try {
        const campaign = await campaignById(clean(req.params.campaignId));
        if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });
        const agency = await membership(campaign.organization_id, req.user.id);
        if (!agency || !['owner', 'manager'].includes(agency.role)) return res.status(404).json({ error: 'Campaign not found.' });
        if (campaign.brand_organization_id) return res.status(409).json({ error: 'A brand is already linked to this campaign.' });
        const brandOrg = await orgById(clean(req.body?.brandOrganizationId));
        if (!brandOrg || brandOrg.type !== 'brand') return res.status(400).json({ error: 'Enter a valid brand workspace ID.' });
        const existing = await listForCampaign(campaign.id);
        if (existing.length) return res.status(409).json({ error: 'This campaign already has a pending brand request.' });
        const request = await write('campaign_brand_requests', {
            id: `brq_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            campaign_id: campaign.id, brand_organization_id: brandOrg.id, requested_by: req.user.id,
            status: 'pending', responded_by: null, created_at: new Date().toISOString(), responded_at: null
        });
        return res.status(201).json({ request, delivery: 'in_app_only' });
    } catch (error) {
        console.error('[BRAND ACCESS REQUEST]', error.message);
        return res.status(503).json({ error: 'The access request could not be created. Confirm the workflow migration is installed.' });
    }
}

async function pending(req, res) {
    if (unavailable(res)) return;
    try {
        const memberships = !supabase
            ? memoryDb.organization_members.filter(row => row.user_id === req.user.id && row.status === 'active' && ['owner', 'manager'].includes(row.role))
            : (await supabase.from('organization_members').select('*').eq('user_id', req.user.id).eq('status', 'active')).data || [];
        const requests = [];
        for (const member of memberships) {
            const org = await orgById(member.organization_id);
            if (org?.type !== 'brand') continue;
            for (const row of await listForOrg(org.id)) {
                const campaign = await campaignById(row.campaign_id);
                if (campaign && !campaign.brand_organization_id) requests.push({ ...row, campaign_name: campaign.name, brand_name: org.name });
            }
        }
        return res.json({ requests });
    } catch (error) {
        return res.status(503).json({ error: 'Brand requests could not be loaded.' });
    }
}

async function respond(req, res) {
    if (unavailable(res)) return;
    try {
        const request = await requestById(clean(req.params.requestId));
        if (!request || request.status !== 'pending') return res.status(404).json({ error: 'Request not found.' });
        const brand = await membership(request.brand_organization_id, req.user.id);
        if (!brand || !['owner', 'manager'].includes(brand.role)) return res.status(404).json({ error: 'Request not found.' });
        const campaign = await campaignById(request.campaign_id);
        if (!campaign || campaign.brand_organization_id) return res.status(409).json({ error: 'The campaign is no longer available for linking.' });
        const decision = clean(req.body?.decision);
        if (!['accepted', 'declined'].includes(decision)) return res.status(400).json({ error: 'Choose accepted or declined.' });
        if (!supabase) {
            if (decision === 'accepted') campaign.brand_organization_id = request.brand_organization_id;
            Object.assign(request, { status: decision, responded_by: req.user.id, responded_at: new Date().toISOString() });
        } else {
            if (decision === 'accepted') {
                const { data: linked, error: linkError } = await supabase.from('campaigns').update({ brand_organization_id: request.brand_organization_id }).eq('id', campaign.id).is('brand_organization_id', null).select('id');
                if (linkError) throw linkError;
                if (!linked?.length) return res.status(409).json({ error: 'Another brand has already been linked.' });
            }
            const { error: requestError } = await supabase.from('campaign_brand_requests').update({ status: decision, responded_by: req.user.id, responded_at: new Date().toISOString() }).eq('id', request.id).eq('status', 'pending');
            if (requestError) throw requestError;
        }
        return res.json({ status: decision });
    } catch (error) {
        console.error('[BRAND ACCESS RESPONSE]', error.message);
        return res.status(503).json({ error: 'The brand decision could not be recorded.' });
    }
}

module.exports = { requestAccess, pending, respond };
