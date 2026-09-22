'use strict';

const crypto = require('node:crypto');
const { supabase } = require('../services/supabase');
const { memoryDb } = require('../services/memoryDb');
const { sanitizeString } = require('../middleware/validation');
const { renderCampaignReport } = require('../services/campaignReportPdf');

const unavailable = res => process.env.NODE_ENV === 'production' && !supabase
    ? (res.status(503).json({ error: 'Campaign reports are temporarily unavailable.' }), true)
    : false;
const text = (value, max) => sanitizeString(typeof value === 'string' ? value : '').slice(0, max);
const safeId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,120}$/.test(value);
const validDate = input => /^\d{4}-\d{2}-\d{2}$/.test(input) && !Number.isNaN(Date.parse(input)) && new Date(input).toISOString().slice(0, 10) === input && input <= new Date().toISOString().slice(0, 10);

async function row(table, column, value) {
    if (!supabase) return memoryDb[table].find(item => item[column] === value) || null;
    const { data, error } = await supabase.from(table).select('*').eq(column, value).maybeSingle();
    if (error) throw error;
    return data;
}

async function rows(table, column, value) {
    if (!supabase) return memoryDb[table].filter(item => item[column] === value);
    const { data, error } = await supabase.from(table).select('*').eq(column, value);
    if (error) throw error;
    return data || [];
}

async function access(req, res) {
    if (unavailable(res)) return null;
    if (!safeId(req.params.campaignId)) { res.status(400).json({ error: 'Invalid campaign.' }); return null; }
    const campaign = await row('campaigns', 'id', req.params.campaignId);
    if (!campaign) { res.status(404).json({ error: 'Campaign not found.' }); return null; }
    const memberships = await rows('organization_members', 'user_id', req.user.id);
    const owns = memberships.find(m => m.status === 'active' && m.organization_id === campaign.organization_id);
    if (owns) {
        const org = await row('organizations', 'id', campaign.organization_id);
        if (org?.type === 'agency' && ['owner', 'manager', 'analyst'].includes(owns.role)) return { campaign, audience: 'agency', membership: owns, agency: org };
    }
    const brand = memberships.find(m => m.status === 'active' && m.organization_id === campaign.brand_organization_id);
    if (brand) {
        const org = await row('organizations', 'id', campaign.brand_organization_id);
        if (org?.type === 'brand' && ['owner', 'manager', 'analyst', 'brand_viewer'].includes(brand.role)) return { campaign, audience: 'brand', membership: brand, brand: org };
    }
    res.status(403).json({ error: 'You do not have access to this campaign report.' });
    return null;
}

function normalisePosts(input) {
    if (!Array.isArray(input) || input.length > 20) throw new Error('Add no more than 20 published posts.');
    return input.map((item, index) => {
        const urlText = text(item?.url, 500);
        let url;
        try { url = new URL(urlText); } catch { throw new Error(`Post ${index + 1} needs a valid link.`); }
        if (url.protocol !== 'https:' || !url.hostname) throw new Error(`Post ${index + 1} needs an HTTPS link.`);
        const publishedOn = text(item?.publishedOn, 10);
        if (!validDate(publishedOn)) throw new Error(`Post ${index + 1} needs a valid publication date.`);
        const asOf = text(item?.asOf, 10);
        const metrics = {};
        for (const key of ['reach', 'views', 'likes', 'comments', 'shares', 'saves']) {
            if (item?.metrics?.[key] === '' || item?.metrics?.[key] == null) continue;
            const value = Number(item.metrics[key]);
            if (!Number.isSafeInteger(value) || value < 0 || value > 1e12) throw new Error(`Post ${index + 1} has an invalid ${key} value.`);
            metrics[key] = value;
        }
        if (Object.keys(metrics).length && (!validDate(asOf) || asOf < publishedOn)) throw new Error(`Post ${index + 1} needs a results date on or after publication.`);
        return { url: url.href, label: text(item?.label, 80) || `Post ${index + 1}`, publishedOn, metrics, asOf: Object.keys(metrics).length ? asOf : null, source: 'Manually supplied by agency' };
    });
}

async function list(req, res) {
    try {
        const scope = await access(req, res);
        if (!scope) return;
        const reports = (await rows('campaign_reports', 'campaign_id', scope.campaign.id))
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .map(r => ({ id: r.id, created_at: r.created_at, summary: r.summary, post_count: r.posts.length }));
        res.set('Cache-Control', 'no-store').json({ reports, audience: scope.audience });
    } catch (error) {
        console.error('[REPORT LIST]', error);
        res.status(503).json({ error: 'Reports could not be loaded.' });
    }
}

async function create(req, res) {
    try {
        const scope = await access(req, res);
        if (!scope) return;
        if (scope.audience !== 'agency' || !['owner', 'manager'].includes(scope.membership.role)) return res.status(403).json({ error: 'Agency manager access is required to create a report.' });
        const summary = text(req.body?.summary, 2000);
        const narrative = {
            objective: text(req.body?.objective, 800),
            successMeasure: text(req.body?.successMeasure, 500),
            interpretation: text(req.body?.interpretation, 1200),
            nextStep: text(req.body?.nextStep, 800),
            decisionNeeded: text(req.body?.decisionNeeded, 500)
        };
        if (summary.length < 10) return res.status(400).json({ error: 'Add a headline takeaway of at least 10 characters.' });
        if (narrative.objective.length < 15) return res.status(400).json({ error: 'Explain the campaign objective in at least 15 characters.' });
        if (narrative.interpretation.length < 20) return res.status(400).json({ error: 'Explain what the evidence means in at least 20 characters.' });
        if (narrative.nextStep.length < 15) return res.status(400).json({ error: 'Add a concrete next step of at least 15 characters.' });
        let posts;
        try { posts = normalisePosts(req.body?.posts || []); }
        catch (error) { return res.status(400).json({ error: error.message }); }
        const brand = scope.campaign.brand_organization_id ? await row('organizations', 'id', scope.campaign.brand_organization_id) : null;
        const snapshot = {
            name: scope.campaign.name,
            brief: scope.campaign.brief,
            status: scope.campaign.status,
            starts_on: scope.campaign.starts_on,
            ends_on: scope.campaign.ends_on,
            fixed_fee: scope.campaign.fixed_fee,
            currency: scope.campaign.currency,
            agency_name: scope.agency.name,
            brand_name: brand?.name || null
        };
        const report = {
            id: `rpt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            campaign_id: scope.campaign.id,
            created_by: req.user.id,
            summary,
            narrative,
            internal_notes: text(req.body?.internalNotes, 1000),
            posts,
            campaign_snapshot: snapshot,
            created_at: new Date().toISOString()
        };
        if (supabase) {
            const { error } = await supabase.from('campaign_reports').insert([report]);
            if (error) throw error;
        } else memoryDb.campaign_reports.push(report);
        res.status(201).set('Cache-Control', 'no-store').json({ report: { id: report.id, created_at: report.created_at }, audience: 'agency' });
    } catch (error) {
        console.error('[REPORT CREATE]', error);
        res.status(503).json({ error: 'Report could not be created. Confirm the report migration is installed.' });
    }
}

async function download(req, res) {
    try {
        const scope = await access(req, res);
        if (!scope) return;
        if (!safeId(req.params.reportId)) return res.status(400).json({ error: 'Invalid report.' });
        const report = await row('campaign_reports', 'id', req.params.reportId);
        if (!report || report.campaign_id !== scope.campaign.id) return res.status(404).json({ error: 'Report not found.' });
        const pdf = await renderCampaignReport(report, scope.audience);
        const filename = `${text(scope.campaign.name, 60).toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'campaign'}-${scope.audience}-report.pdf`;
        res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }).send(pdf);
    } catch (error) {
        console.error('[REPORT PDF]', error);
        res.status(503).json({ error: 'The PDF could not be prepared.' });
    }
}

module.exports = { list, create, download };
