'use strict';

const crypto = require('crypto');
const { supabase } = require('../services/supabase');
const { memoryDb } = require('../services/memoryDb');
const { sanitizeString } = require('../middleware/validation');
const { campaignById, membership, canAccessCampaign } = require('./collaborationController');
const { uploadAsset } = require('../services/storageService');

const clean = (value, max = 2000) => sanitizeString(String(value || '')).trim().slice(0, max);
const newId = prefix => `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
const unavailable = res => process.env.NODE_ENV === 'production' && !supabase
    ? (res.status(503).json({ error: 'Campaign workflow is temporarily unavailable.' }), true) : false;

async function rows(table, column, value) {
    if (!supabase) return memoryDb[table].filter(row => row[column] === value);
    const { data, error } = await supabase.from(table).select('*').eq(column, value);
    if (error) throw error;
    return data || [];
}

async function one(table, id) {
    if (!supabase) return memoryDb[table].find(row => row.id === id) || null;
    const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
}

async function insert(table, value) {
    if (!supabase) { memoryDb[table].push(value); return value; }
    const { data, error } = await supabase.from(table).insert([value]).select().single();
    if (error) throw error;
    return data;
}

async function update(table, id, patch, expectedStatus) {
    if (!supabase) {
        const row = await one(table, id);
        if (!row || row.status !== expectedStatus) {
            const conflict = new Error('This deliverable changed while you were reviewing it. Refresh and try again.');
            conflict.code = 'CONFLICT';
            throw conflict;
        }
        Object.assign(row, patch);
        return row;
    }
    const { data, error } = await supabase.from(table).update(patch).eq('id', id).eq('status', expectedStatus).select().maybeSingle();
    if (error) throw error;
    if (!data) {
        const conflict = new Error('This deliverable changed while you were reviewing it. Refresh and try again.');
        conflict.code = 'CONFLICT';
        throw conflict;
    }
    return data;
}

function validHttpsUrl(value) {
    if (typeof value === 'string' && value.startsWith('/uploads/')) return true;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && url.hostname && !url.username && !url.password;
    } catch (_) { return false; }
}

async function access(req, res) {
    const campaign = await campaignById(clean(req.params.campaignId, 100));
    if (!await canAccessCampaign(campaign, req.user.id)) {
        res.status(404).json({ error: 'Campaign not found.' });
        return null;
    }
    return campaign;
}

async function manager(campaign, userId, includeBrand = false) {
    const agency = await membership(campaign.organization_id, userId);
    if (agency && ['owner', 'manager'].includes(agency.role)) return true;
    if (includeBrand && campaign.brand_organization_id) {
        const brand = await membership(campaign.brand_organization_id, userId);
        return Boolean(brand && ['owner', 'manager'].includes(brand.role));
    }
    return false;
}

async function assigned(campaignId, userId) {
    const assignments = await rows('campaign_creators', 'campaign_id', campaignId);
    return assignments.some(item => item.creator_user_id === userId && item.consent_status === 'accepted');
}

async function event(deliverable, userId, type, note = '', contentUrl = '') {
    return insert('campaign_deliverable_events', {
        id: newId('evt'), campaign_id: deliverable.campaign_id, deliverable_id: deliverable.id,
        actor_user_id: userId, event_type: type, note, content_url: contentUrl || null,
        created_at: new Date().toISOString()
    });
}

async function details(req, res) {
    if (unavailable(res)) return;
    try {
        const campaign = await access(req, res);
        if (!campaign) return;
        const deliverables = await rows('campaign_deliverables', 'campaign_id', campaign.id);
        const events = await rows('campaign_deliverable_events', 'campaign_id', campaign.id);
        const metrics = await rows('campaign_metric_snapshots', 'campaign_id', campaign.id);
        const assignments = await rows('campaign_creators', 'campaign_id', campaign.id);
        const brandRequests = await rows('campaign_brand_requests', 'campaign_id', campaign.id);
        const isCreator = assignments.some(a => a.creator_user_id === req.user.id && a.consent_status === 'accepted');
        const orgMember = await membership(campaign.organization_id, req.user.id)
            || (campaign.brand_organization_id && await membership(campaign.brand_organization_id, req.user.id));
        const visibleDeliverables = isCreator && !orgMember
            ? deliverables.filter(d => d.creator_user_id === req.user.id) : deliverables;
        const ids = new Set(visibleDeliverables.map(d => d.id));
        const agencyManager = await manager(campaign, req.user.id);
        return res.json({ campaign: orgMember ? campaign : { ...campaign, fixed_fee: null }, deliverables: visibleDeliverables, events: events.filter(e => ids.has(e.deliverable_id)).sort((a, b) => a.created_at.localeCompare(b.created_at)), metrics: metrics.filter(m => ids.has(m.deliverable_id)), assignments: agencyManager ? assignments : [], brandRequests: agencyManager ? brandRequests.filter(r => r.status === 'pending') : [] });
    } catch (error) {
        console.error('[CAMPAIGN DETAILS]', error.message);
        return res.status(503).json({ error: 'Campaign details are unavailable. Confirm the workflow migration is installed.' });
    }
}

async function create(req, res) {
    if (unavailable(res)) return;
    try {
        const campaign = await access(req, res);
        if (!campaign) return;
        if (!await manager(campaign, req.user.id)) return res.status(403).json({ error: 'Agency manager access is required.' });
        const title = clean(req.body?.title, 160);
        const creatorUserId = clean(req.body?.creatorUserId, 100);
        const platform = clean(req.body?.platform, 40);
        if (title.length < 2 || !creatorUserId || !platform) return res.status(400).json({ error: 'Title, assigned creator and platform are required.' });
        const assignments = await rows('campaign_creators', 'campaign_id', campaign.id);
        if (!assignments.some(a => a.creator_user_id === creatorUserId && a.consent_status === 'accepted')) return res.status(400).json({ error: 'The creator must accept the campaign first.' });
        const dueAt = req.body?.dueAt ? new Date(req.body.dueAt) : null;
        if (dueAt && Number.isNaN(dueAt.getTime())) return res.status(400).json({ error: 'Invalid due date.' });
        const deliverable = await insert('campaign_deliverables', {
            id: newId('del'), campaign_id: campaign.id, creator_user_id: creatorUserId,
            title, platform, external_content_id: null, content_url: null, status: 'planned',
            due_at: dueAt ? dueAt.toISOString() : null, created_at: new Date().toISOString()
        });
        await event(deliverable, req.user.id, 'planned');
        return res.status(201).json({ deliverable });
    } catch (error) {
        console.error('[CREATE DELIVERABLE]', error.message);
        return res.status(503).json({ error: 'The deliverable could not be created.' });
    }
}

async function transition(req, res) {
    if (unavailable(res)) return;
    try {
        const campaign = await access(req, res);
        if (!campaign) return;
        const deliverable = await one('campaign_deliverables', clean(req.params.deliverableId, 100));
        if (!deliverable || deliverable.campaign_id !== campaign.id) return res.status(404).json({ error: 'Deliverable not found.' });
        const action = clean(req.body?.action, 30);
        const note = clean(req.body?.note, 1000);
        const contentUrl = clean(req.body?.contentUrl, 2000);
        let nextStatus;
        if (action === 'submit' && ['planned', 'revision'].includes(deliverable.status)) {
            if (deliverable.creator_user_id !== req.user.id || !await assigned(campaign.id, req.user.id)) return res.status(403).json({ error: 'Assigned creator access is required.' });
            if (!validHttpsUrl(contentUrl)) return res.status(400).json({ error: 'A secure content link is required.' });
            nextStatus = 'submitted';
        } else if (action === 'request_revision' && deliverable.status === 'submitted') {
            if (!await manager(campaign, req.user.id, true)) return res.status(403).json({ error: 'Reviewer access is required.' });
            if (note.length < 3) return res.status(400).json({ error: 'Give the creator a clear revision note.' });
            nextStatus = 'revision';
        } else if (action === 'approve' && deliverable.status === 'submitted') {
            if (!await manager(campaign, req.user.id, true)) return res.status(403).json({ error: 'Reviewer access is required.' });
            nextStatus = 'approved';
        } else if (action === 'publish' && deliverable.status === 'approved') {
            if (deliverable.creator_user_id !== req.user.id || !await assigned(campaign.id, req.user.id)) return res.status(403).json({ error: 'Assigned creator access is required.' });
            if (!validHttpsUrl(contentUrl)) return res.status(400).json({ error: 'A secure published-post link is required.' });
            nextStatus = 'published';
        } else return res.status(409).json({ error: 'This action is not available at the current stage.' });
        const updated = await update('campaign_deliverables', deliverable.id, {
            status: nextStatus, ...(contentUrl ? { content_url: contentUrl } : {})
        }, deliverable.status);
        await event(updated, req.user.id, action, note, contentUrl);
        return res.json({ deliverable: updated });
    } catch (error) {
        if (error.code === 'CONFLICT') return res.status(409).json({ error: error.message });
        console.error('[DELIVERABLE TRANSITION]', error.message);
        return res.status(503).json({ error: 'The deliverable could not be updated.' });
    }
}

async function addManualMetric(req, res) {
    if (unavailable(res)) return;
    try {
        const campaign = await access(req, res);
        if (!campaign) return;
        const deliverable = await one('campaign_deliverables', clean(req.params.deliverableId, 100));
        if (!deliverable || deliverable.campaign_id !== campaign.id) return res.status(404).json({ error: 'Deliverable not found.' });
        if (deliverable.status !== 'published') return res.status(409).json({ error: 'Record results after the published link is attached.' });
        const agencyManager = await manager(campaign, req.user.id);
        const creator = deliverable.creator_user_id === req.user.id && await assigned(campaign.id, req.user.id);
        if (!agencyManager && !creator) return res.status(403).json({ error: 'Only the assigned creator or agency manager can enter results.' });
        const metricName = clean(req.body?.metricName, 40).toLowerCase();
        const allowed = ['reach', 'views', 'likes', 'comments', 'shares', 'saves', 'clicks'];
        const metricValue = Number(req.body?.metricValue);
        if (!allowed.includes(metricName) || !Number.isFinite(metricValue) || metricValue < 0 || !Number.isInteger(metricValue)) {
            return res.status(400).json({ error: 'Choose a supported metric and enter a non-negative whole number.' });
        }
        const snapshot = await insert('campaign_metric_snapshots', {
            id: newId('met'), campaign_id: campaign.id, deliverable_id: deliverable.id,
            creator_user_id: deliverable.creator_user_id, provider: 'manual', metric_name: metricName,
            metric_value: metricValue, captured_at: new Date().toISOString(), source_updated_at: null,
            entered_by: req.user.id, created_at: new Date().toISOString()
        });
        return res.status(201).json({ snapshot, verification: 'self_reported' });
    } catch (error) {
        console.error('[MANUAL METRIC]', error.message);
        return res.status(503).json({ error: 'The result could not be recorded.' });
    }
}

async function uploadDeliverableAsset(req, res) {
    if (unavailable(res)) return;
    try {
        const campaign = await access(req, res);
        if (!campaign) return;
        const deliverableId = clean(req.params.deliverableId, 100);
        const deliverable = await one('campaign_deliverables', deliverableId);
        if (!deliverable || deliverable.campaign_id !== campaign.id) {
            return res.status(404).json({ error: 'Deliverable not found.' });
        }

        const isManager = await manager(campaign, req.user.id, true);
        const isAssigned = deliverable.creator_user_id === req.user.id && await assigned(campaign.id, req.user.id);
        if (!isManager && !isAssigned) {
            return res.status(403).json({ error: 'Only the assigned creator or campaign manager can upload assets.' });
        }

        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ error: 'No file was provided for upload.' });
        }

        const assetType = clean(req.body?.assetType || 'draft', 30);
        const folder = `campaigns/${campaign.id}/deliverables/${deliverable.id}/${assetType}`;

        const uploadResult = await uploadAsset({
            buffer: req.file.buffer,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            folder
        });

        return res.status(201).json({
            success: true,
            asset: uploadResult
        });
    } catch (error) {
        console.error('[UPLOAD ASSET ERROR]', error.message);
        return res.status(500).json({ error: 'Failed to upload asset: ' + error.message });
    }
}

module.exports = { details, create, transition, addManualMetric, uploadDeliverableAsset };
