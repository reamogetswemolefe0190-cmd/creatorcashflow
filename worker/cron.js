'use strict';
// ==========================================================================
// Automation v1 — cron jobs. Runs from worker/entry.js scheduled() (prod cron
// trigger "0 8 * * *") and locally via wrangler dev:
//   curl "http://127.0.0.1:5001/cdn-cgi/local/scheduled"
//
// Jobs (all idempotent, deduped via KV, audited into audit_logs):
//   1. expireInvitations   — pending invitations past expires_at -> expired
//   2. dueDateNudges       — deliverables due within 48h -> email creator
//   3. staleReviewNudges   — submitted/revision with no event for 3d -> email manager
//   4. reportOnPublish     — deliverable published in last 24h -> email manager
//                             that a campaign report is due
// Money is never moved by cron: nudges/reports only (per the payments decision).
// ==========================================================================

const emailService = require('../services/emailService');

function nowIso() { return new Date().toISOString(); }
function appOrigin() { return process.env.APP_ORIGIN || 'http://127.0.0.1:5001'; }
function newId(prefix) {
    return `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

async function sendEmail({ to, subject, html, text }) {
    const r = await emailService.sendEmail({ to, subject, html, text });
    return r.ok;
}

async function audit(db, actionType, newValue) {
    await db.prepare(
        `INSERT INTO audit_logs (id, admin_id, target_creator_id, action_type, old_value, new_value, timestamp)
         VALUES (?, 'system_cron', '', ?, NULL, ?, ?)`
    ).bind(newId('log'), actionType, newValue, nowIso()).run();
}

const esc = emailService.esc;

async function expireInvitations(db) {
    const res = await db.prepare(
        `UPDATE organization_invitations SET status = 'expired' WHERE status = 'pending' AND expires_at < ?`
    ).bind(nowIso()).run();
    const n = res.meta?.changes || 0;
    if (n > 0) {
        await audit(db, 'cron_invitation_expiry', JSON.stringify({ expired: n }));
        console.log('[CRON] expired invitations:', n);
    }
    return n;
}

async function dueDateNudges(db, kv, now) {
    const soon = new Date(now.getTime() + 48 * 3600 * 1000).toISOString();
    const { results } = await db.prepare(
        `SELECT d.id, d.title, d.due_at, d.status, c.name AS campaign_name, c.id AS campaign_id,
                u.email AS creator_email, u.name AS creator_name
         FROM campaign_deliverables d
         JOIN campaigns c ON c.id = d.campaign_id
         JOIN users u ON u.id = d.creator_user_id
         WHERE d.status IN ('planned','submitted','revision')
           AND d.due_at IS NOT NULL AND d.due_at >= ? AND d.due_at <= ?`
    ).bind(nowIso(), soon).all();

    let sent = 0;
    for (const r of results || []) {
        const dedupKey = `cron:nudge-due:${r.id}`;
        if (await kv.get(dedupKey)) continue;
        const due = new Date(r.due_at).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Johannesburg' });
        const tpl = emailService.dueSoonEmail({
            creatorName: r.creator_name, title: r.title, campaignName: r.campaign_name, due, campaignId: r.campaign_id
        });
        await sendEmail({ to: r.creator_email, subject: tpl.subject, html: tpl.html, text: tpl.text });
        await kv.put(dedupKey, '1', { expirationTtl: 72 * 3600 });
        sent++;
    }
    if (sent > 0) await audit(db, 'cron_due_date_nudges', JSON.stringify({ sent }));
    return sent;
}

async function staleReviewNudges(db, kv, now) {
    const cutoff = new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString();
    const { results } = await db.prepare(
        `SELECT d.id, d.title, d.status, c.name AS campaign_name, c.id AS campaign_id,
                m.email AS manager_email, m.name AS manager_name,
                (SELECT MAX(e.created_at) FROM campaign_deliverable_events e WHERE e.deliverable_id = d.id) AS last_event_at
         FROM campaign_deliverables d
         JOIN campaigns c ON c.id = d.campaign_id
         JOIN users m ON m.id = c.created_by
         WHERE d.status IN ('submitted','revision')`
    ).all();

    let sent = 0;
    for (const r of results || []) {
        if (r.last_event_at && r.last_event_at >= cutoff) continue;
        const dedupKey = `cron:nudge-review:${r.id}`;
        if (await kv.get(dedupKey)) continue;
        const tpl = emailService.needsDecisionEmail({
            managerName: r.manager_name, title: r.title, campaignName: r.campaign_name, status: r.status, campaignId: r.campaign_id
        });
        await sendEmail({ to: r.manager_email, subject: tpl.subject, html: tpl.html, text: tpl.text });
        await kv.put(dedupKey, '1', { expirationTtl: 72 * 3600 });
        sent++;
    }
    if (sent > 0) await audit(db, 'cron_stale_review_nudges', JSON.stringify({ sent }));
    return sent;
}

async function reportOnPublish(db, kv, now) {
    const since = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const { results } = await db.prepare(
        `SELECT e.campaign_id AS campaign_id, c.name AS campaign_name, m.email AS manager_email, m.name AS manager_name,
                COUNT(DISTINCT e.deliverable_id) AS published_count
         FROM campaign_deliverable_events e
         JOIN campaigns c ON c.id = e.campaign_id
         JOIN users m ON m.id = c.created_by
         WHERE e.event_type = 'publish' AND e.created_at >= ?
         GROUP BY e.campaign_id`
    ).bind(since).all();

    let sent = 0;
    const day = now.toISOString().slice(0, 10);
    for (const r of results || []) {
        const dedupKey = `cron:report-publish:${r.campaign_id}:${day}`;
        if (await kv.get(dedupKey)) continue;
        const tpl = emailService.reportDueEmail({
            managerName: r.manager_name, campaignName: r.campaign_name, publishedCount: r.published_count, campaignId: r.campaign_id
        });
        await sendEmail({ to: r.manager_email, subject: tpl.subject, html: tpl.html, text: tpl.text });
        await kv.put(dedupKey, '1', { expirationTtl: 48 * 3600 });
        sent++;
    }
    if (sent > 0) await audit(db, 'cron_report_on_publish', JSON.stringify({ sent }));
    return sent;
}

async function runCronJobs(env) {
    const db = env.DB;
    const kv = env.KV;
    const now = new Date();
    const summary = {
        at: nowIso(),
        expiredInvitations: await expireInvitations(db),
        dueDateNudges: await dueDateNudges(db, kv, now),
        staleReviewNudges: await staleReviewNudges(db, kv, now),
        reportOnPublish: await reportOnPublish(db, kv, now)
    };
    console.log('[CRON] run complete:', JSON.stringify(summary));
    return summary;
}

module.exports = { runCronJobs };
