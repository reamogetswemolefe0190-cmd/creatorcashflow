'use strict';

const crypto = require('crypto');
const { supabase } = require('../services/supabase');
const { memoryDb, findUserByEmail } = require('../services/memoryDb');
const { sanitizeString } = require('../middleware/validation');
const { RESEND_API_KEY } = require('../config/env');
const emailService = require('../services/emailService');

const id = prefix => `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
const clean = (value, max = 160) => sanitizeString(String(value || '')).slice(0, max);
const isProdUnavailable = res => process.env.NODE_ENV === 'production' && !supabase
    ? (res.status(503).json({ error: 'Campaign collaboration is temporarily unavailable.' }), true)
    : false;

function getAppOrigin(req) {
    if (process.env.APP_ORIGIN) return process.env.APP_ORIGIN.replace(/\/$/, '');
    if (process.env.DEMO_PUBLIC_URL) {
        try {
            const u = new URL(process.env.DEMO_PUBLIC_URL);
            return `${u.protocol}//${u.host}`;
        } catch (_) {}
    }
    const host = req.get('x-forwarded-host') || req.get('host') || '127.0.0.1:5000';
    const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
    return `${proto}://${host}`;
}

async function insert(table, row) {
    if (!supabase) { memoryDb[table].push(row); return row; }
    const { data, error } = await supabase.from(table).insert([row]).select().single();
    if (error) throw error;
    return data;
}

async function membership(orgId, userId) {
    if (!supabase) return memoryDb.organization_members.find(m => m.organization_id === orgId && m.user_id === userId && m.status === 'active');
    const { data } = await supabase.from('organization_members').select('*').eq('organization_id', orgId).eq('user_id', userId).eq('status', 'active').maybeSingle();
    return data;
}

async function campaignById(campaignId) {
    if (!supabase) return memoryDb.campaigns.find(c => c.id === campaignId);
    const { data } = await supabase.from('campaigns').select('*').eq('id', campaignId).maybeSingle();
    return data;
}

async function canAccessCampaign(campaign, userId) {
    if (!campaign) return false;
    if (await membership(campaign.organization_id, userId)) return true;
    if (campaign.brand_organization_id && await membership(campaign.brand_organization_id, userId)) return true;
    if (!supabase) return memoryDb.campaign_creators.some(a =>
        a.campaign_id === campaign.id && a.creator_user_id === userId && a.consent_status === 'accepted');
    const { data, error } = await supabase.from('campaign_creators')
        .select('campaign_id').eq('campaign_id', campaign.id).eq('creator_user_id', userId)
        .eq('consent_status', 'accepted').maybeSingle();
    if (error) throw error;
    return Boolean(data);
}

async function requireManager(req, res, orgId) {
    const member = await membership(orgId, req.user.id);
    if (!member || !['owner', 'manager'].includes(member.role)) {
        res.status(403).json({ error: 'Agency or brand manager access is required.' });
        return null;
    }
    return member;
}

async function createOrganization(req, res) {
    if (isProdUnavailable(res)) return;
    try {
        const name = clean(req.body?.name, 120);
        const type = clean(req.body?.type, 20).toLowerCase();
        if (name.length < 2 || !['agency', 'brand'].includes(type)) return res.status(400).json({ error: 'A valid organization name and type are required.' });
        const organization = await insert('organizations', { id: id('org'), name, type, created_by: req.user.id, created_at: new Date().toISOString() });
        await insert('organization_members', { organization_id: organization.id, user_id: req.user.id, role: 'owner', status: 'active', created_at: new Date().toISOString() });
        return res.status(201).json({ organization });
    } catch (error) {
        console.error('[CREATE ORGANIZATION]', error.message);
        return res.status(503).json({ error: 'The organisation could not be created. Confirm the collaboration database migration is installed.' });
    }
}

async function inviteMember(req, res) {
    if (isProdUnavailable(res)) return;
    try {
        if (!await requireManager(req, res, req.params.organizationId)) return;
        const email = clean(req.body?.email, 254).toLowerCase();
        const role = clean(req.body?.role, 20).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !['manager', 'analyst', 'creator', 'brand_viewer'].includes(role)) {
            return res.status(400).json({ error: 'A valid email and invitation role are required.' });
        }

        // Fetch organization name
        let org = null;
        if (supabase) {
            const { data } = await supabase.from('organizations').select('id, name, type').eq('id', req.params.organizationId).maybeSingle();
            org = data;
        } else {
            org = memoryDb.organizations.find(o => o.id === req.params.organizationId);
        }
        if (!org) return res.status(404).json({ error: 'Organization not found.' });

        const invitationId = id('inv');
        const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
        const invitation = await insert('organization_invitations', {
            id: invitationId,
            organization_id: req.params.organizationId,
            email,
            role,
            invited_by: req.user.id,
            status: 'pending',
            expires_at: expiresAt,
            accepted_by: null,
            created_at: new Date().toISOString()
        });

        const appOrigin = getAppOrigin(req);
        const inviteUrl = `${appOrigin}/invite.html?token=${encodeURIComponent(invitationId)}`;
        const orgName = org.name || 'Workspace';
        const inviterName = req.user.name || 'A team manager';

        let delivery = 'pending_email_integration';
        if (RESEND_API_KEY) {
            try {
                const roleLabels = {
                    manager: 'Campaign Manager',
                    analyst: 'Analyst',
                    creator: 'Creator',
                    brand_viewer: 'Brand Reviewer'
                };
                const displayRole = roleLabels[role] || role;

                const tpl = emailService.inviteEmail({ orgName, inviterName, roleLabel: displayRole, inviteUrl });
                const result = await emailService.sendEmail({ to: email, subject: tpl.subject, html: tpl.html, text: tpl.text });

                if (result.ok) {
                    delivery = 'sent';
                    console.log(`[RESEND] Invitation email sent to ${email} for org ${orgName}`);
                } else {
                    console.error('[RESEND] Failed to send invitation email:', result.status);
                    delivery = 'failed';
                }
            } catch (sendErr) {
                console.error('[RESEND DISPATCH ERROR]', sendErr.message);
                delivery = 'failed';
            }
        }

        return res.status(201).json({
            success: true,
            invitation,
            inviteUrl,
            delivery
        });
    } catch (error) {
        console.error('[INVITE MEMBER]', error.message);
        return res.status(503).json({ error: 'The invitation could not be created.' });
    }
}

async function listInvitations(req, res) {
    if (isProdUnavailable(res)) return;
    try {
        if (!await requireManager(req, res, req.params.organizationId)) return;
        if (!supabase) {
            const list = memoryDb.organization_invitations.filter(i => i.organization_id === req.params.organizationId);
            return res.json({ invitations: list });
        }
        const { data, error } = await supabase.from('organization_invitations')
            .select('*')
            .eq('organization_id', req.params.organizationId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return res.json({ invitations: data || [] });
    } catch (err) {
        return res.status(503).json({ error: 'Failed to load invitations.' });
    }
}

async function getInvitation(req, res) {
    if (isProdUnavailable(res)) return;
    const token = clean(req.params.token, 100);
    try {
        let invitation = null;
        if (!supabase) {
            invitation = memoryDb.organization_invitations.find(i => i.id === token);
        } else {
            const { data, error } = await supabase.from('organization_invitations').select('*').eq('id', token).maybeSingle();
            if (error) throw error;
            invitation = data;
        }
        if (!invitation) return res.status(404).json({ error: 'Invitation not found or invalid link.' });

        const isExpired = new Date(invitation.expires_at) < new Date();
        if (isExpired && invitation.status === 'pending') {
            invitation.status = 'expired';
            if (supabase) {
                await supabase.from('organization_invitations').update({ status: 'expired' }).eq('id', token);
            }
        }

        let org = null;
        if (!supabase) {
            org = memoryDb.organizations.find(o => o.id === invitation.organization_id);
        } else {
            const { data } = await supabase.from('organizations').select('id, name, type').eq('id', invitation.organization_id).maybeSingle();
            org = data;
        }

        let inviterName = 'A team member';
        if (!supabase) {
            const u = memoryDb.users.find(u => u.id === invitation.invited_by);
            if (u) inviterName = u.name;
        } else {
            const { data } = await supabase.from('users').select('name').eq('id', invitation.invited_by).maybeSingle();
            if (data?.name) inviterName = data.name;
        }

        return res.json({
            invitation: {
                id: invitation.id,
                email: invitation.email,
                role: invitation.role,
                status: invitation.status,
                expires_at: invitation.expires_at
            },
            organization: org ? { id: org.id, name: org.name, type: org.type } : null,
            inviter: { name: inviterName }
        });
    } catch (err) {
        console.error('[GET INVITATION ERROR]', err.message);
        return res.status(503).json({ error: 'Failed to retrieve invitation details.' });
    }
}

async function acceptInvitation(req, res) {
    if (isProdUnavailable(res)) return;
    const token = clean(req.params.token, 100);
    try {
        let invitation = null;
        if (!supabase) {
            invitation = memoryDb.organization_invitations.find(i => i.id === token);
        } else {
            const { data, error } = await supabase.from('organization_invitations').select('*').eq('id', token).maybeSingle();
            if (error) throw error;
            invitation = data;
        }
        if (!invitation) return res.status(404).json({ error: 'Invitation not found.' });

        if (invitation.status === 'accepted') {
            return res.status(400).json({ error: 'This invitation has already been accepted.' });
        }
        if (invitation.status === 'revoked') {
            return res.status(400).json({ error: 'This invitation has been revoked.' });
        }
        if (new Date(invitation.expires_at) < new Date() || invitation.status === 'expired') {
            return res.status(400).json({ error: 'This invitation has expired.' });
        }

        if (req.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
            return res.status(403).json({
                error: `This invitation was issued to ${invitation.email}. You are currently signed in as ${req.user.email}.`
            });
        }

        if (supabase) {
            const { data: existingMember } = await supabase.from('organization_members')
                .select('*')
                .eq('organization_id', invitation.organization_id)
                .eq('user_id', req.user.id)
                .maybeSingle();

            if (!existingMember) {
                const { error: memberErr } = await supabase.from('organization_members').insert([{
                    organization_id: invitation.organization_id,
                    user_id: req.user.id,
                    role: invitation.role,
                    status: 'active',
                    created_at: new Date().toISOString()
                }]);
                if (memberErr) throw memberErr;
            } else if (existingMember.status !== 'active') {
                await supabase.from('organization_members').update({ status: 'active', role: invitation.role }).eq('organization_id', invitation.organization_id).eq('user_id', req.user.id);
            }

            const { error: invErr } = await supabase.from('organization_invitations').update({
                status: 'accepted',
                accepted_by: req.user.id
            }).eq('id', token);
            if (invErr) throw invErr;

            try {
                const { data: userData } = await supabase.from('users').select('*').eq('id', req.user.id).single();
                if (userData && !userData.organization_id) {
                    const targetAppRole = invitation.role === 'brand_viewer' ? 'brand' : (invitation.role === 'manager' || invitation.role === 'analyst' ? 'agency' : 'creator');
                    await supabase.from('users').update({
                        organization_id: invitation.organization_id,
                        role: targetAppRole
                    }).eq('id', req.user.id);
                }
            } catch (_) {
                // Non-fatal if optional columns are not yet added to users; organization_members is authoritative
            }
        } else {
            const memMember = memoryDb.organization_members.find(m => m.organization_id === invitation.organization_id && m.user_id === req.user.id);
            if (!memMember) {
                memoryDb.organization_members.push({
                    organization_id: invitation.organization_id,
                    user_id: req.user.id,
                    role: invitation.role,
                    status: 'active',
                    created_at: new Date().toISOString()
                });
            }
            invitation.status = 'accepted';
            invitation.accepted_by = req.user.id;
        }

        return res.json({
            success: true,
            message: 'You have joined the workspace!',
            organizationId: invitation.organization_id,
            role: invitation.role
        });
    } catch (err) {
        console.error('[ACCEPT INVITATION ERROR]', err.message);
        return res.status(503).json({ error: 'Failed to accept invitation. Please try again.' });
    }
}

async function createCampaign(req, res) {
    if (isProdUnavailable(res)) return;
    try {
        const organizationId = clean(req.body?.organizationId, 100);
        if (!await requireManager(req, res, organizationId)) return;
        const name = clean(req.body?.name, 160);
        if (name.length < 2) return res.status(400).json({ error: 'Campaign name is required.' });
        const fixedFee = Number(req.body?.fixedFee || 0);
        if (!Number.isFinite(fixedFee) || fixedFee < 0) return res.status(400).json({ error: 'The recorded fee must be zero or a positive amount.' });
        if (req.body?.brandOrganizationId) return res.status(400).json({ error: 'A brand must accept a campaign access request before being linked.' });
        const campaign = await insert('campaigns', { id: id('cmp'), organization_id: organizationId, brand_organization_id: null, name, brief: clean(req.body?.brief, 4000), status: 'draft', starts_on: req.body?.startsOn || null, ends_on: req.body?.endsOn || null, currency: 'ZAR', fixed_fee: fixedFee, created_by: req.user.id, created_at: new Date().toISOString() });
        return res.status(201).json({ campaign });
    } catch (error) {
        console.error('[CREATE CAMPAIGN]', error.message);
        return res.status(503).json({ error: 'The campaign could not be created.' });
    }
}

async function assignCreator(req, res) {
    if (isProdUnavailable(res)) return;
    try {
        const campaign = await campaignById(req.params.campaignId);
        if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });
        if (!await requireManager(req, res, campaign.organization_id)) return;
        const email = clean(req.body?.email, 254).toLowerCase();
        let creator = null;
        if (supabase) {
            const result = await supabase.from('users').select('id,email,name').eq('email', email).maybeSingle();
            creator = result.data;
        } else creator = findUserByEmail(email);
        if (!creator) return res.status(404).json({ error: 'The creator must create an account before being assigned.' });
        const assignment = await insert('campaign_creators', { campaign_id: campaign.id, creator_user_id: creator.id, assigned_by: req.user.id, consent_status: 'invited', consented_at: null, data_scope: { identity: true, engagement: true, audience: false, income: false }, created_at: new Date().toISOString() });
        return res.status(201).json({ assignment, creator: { id: creator.id, name: creator.name, email: creator.email } });
    } catch (error) {
        if (String(error.message).includes('duplicate')) return res.status(409).json({ error: 'This creator is already assigned.' });
        console.error('[ASSIGN CREATOR]', error.message);
        return res.status(503).json({ error: 'The creator could not be assigned.' });
    }
}

async function acceptAssignment(req, res) {
    if (isProdUnavailable(res)) return;
    const campaignId = req.params.campaignId;
    const scope = { identity: true, engagement: true, audience: Boolean(req.body?.audience), income: false };
    if (!supabase) {
        const assignment = memoryDb.campaign_creators.find(a => a.campaign_id === campaignId && a.creator_user_id === req.user.id);
        if (!assignment) return res.status(404).json({ error: 'Campaign invitation not found.' });
        Object.assign(assignment, { consent_status: 'accepted', consented_at: new Date().toISOString(), data_scope: scope });
        return res.json({ assignment });
    }
    const { data, error } = await supabase.from('campaign_creators').update({ consent_status: 'accepted', consented_at: new Date().toISOString(), data_scope: scope }).eq('campaign_id', campaignId).eq('creator_user_id', req.user.id).eq('consent_status', 'invited').select().maybeSingle();
    if (error) return res.status(503).json({ error: 'The campaign invitation could not be accepted.' });
    if (!data) return res.status(404).json({ error: 'Campaign invitation not found.' });
    return res.json({ assignment: data });
}

async function createMilestone(req, res) {
    if (isProdUnavailable(res)) return;
    try {
        const campaign = await campaignById(req.params.campaignId);
        if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });
        if (!await requireManager(req, res, campaign.organization_id)) return;
        const target = Number(req.body?.targetValue);
        if (!Number.isFinite(target) || target <= 0) return res.status(400).json({ error: 'A positive milestone target is required.' });
        const milestone = await insert('campaign_milestones', { id: id('mil'), campaign_id: campaign.id, name: clean(req.body?.name, 160), metric_name: clean(req.body?.metricName, 80), target_value: target, bonus_amount: Math.max(0, Number(req.body?.bonusAmount || 0)), status: 'tracking', reached_at: null, verification_ends_at: null, approved_by: null, approved_at: null, created_at: new Date().toISOString() });
        return res.status(201).json({ milestone });
    } catch (error) {
        console.error('[CREATE MILESTONE]', error.message);
        return res.status(503).json({ error: 'The milestone could not be created.' });
    }
}

async function getWorkspace(req, res) {
    if (isProdUnavailable(res)) return;
    if (!supabase) {
        const memberships = memoryDb.organization_members.filter(m => m.user_id === req.user.id && m.status === 'active');
        const orgIds = memberships.map(m => m.organization_id);
        const assignments = memoryDb.campaign_creators.filter(a => a.creator_user_id === req.user.id);
        const campaignIds = assignments.map(a => a.campaign_id);
        const campaigns = memoryDb.campaigns.filter(c => orgIds.includes(c.organization_id) || orgIds.includes(c.brand_organization_id) || campaignIds.includes(c.id))
            .map(c => orgIds.includes(c.organization_id) || orgIds.includes(c.brand_organization_id) ? c : { ...c, fixed_fee: null });
        return res.json({ organizations: memoryDb.organizations.filter(o => orgIds.includes(o.id)), memberships, campaigns, assignments });
    }
    try {
        const memberResult = await supabase.from('organization_members').select('*').eq('user_id', req.user.id).eq('status', 'active');
        const assignmentResult = await supabase.from('campaign_creators').select('*').eq('creator_user_id', req.user.id);
        if (memberResult.error || assignmentResult.error) throw memberResult.error || assignmentResult.error;
        const orgIds = memberResult.data.map(m => m.organization_id);
        const campaignIds = assignmentResult.data.map(a => a.campaign_id);
        const orgResult = orgIds.length ? await supabase.from('organizations').select('*').in('id', orgIds) : { data: [] };
        const ownedCampaigns = orgIds.length ? await supabase.from('campaigns').select('*').in('organization_id', orgIds) : { data: [] };
        const brandCampaigns = orgIds.length ? await supabase.from('campaigns').select('*').in('brand_organization_id', orgIds) : { data: [] };
        const assignedCampaigns = campaignIds.length ? await supabase.from('campaigns').select('*').in('id', campaignIds) : { data: [] };
        if (orgResult.error || ownedCampaigns.error || brandCampaigns.error || assignedCampaigns.error) throw orgResult.error || ownedCampaigns.error || brandCampaigns.error || assignedCampaigns.error;
        const merged = [...(ownedCampaigns.data || []), ...(brandCampaigns.data || []), ...(assignedCampaigns.data || [])].filter((c, index, all) => all.findIndex(x => x.id === c.id) === index);
        const visibleCampaigns = merged.map(c => orgIds.includes(c.organization_id) || orgIds.includes(c.brand_organization_id) ? c : { ...c, fixed_fee: null });
        return res.json({ organizations: orgResult.data || [], memberships: memberResult.data, campaigns: visibleCampaigns, assignments: assignmentResult.data });
    } catch (error) {
        return res.status(503).json({ error: 'Workspace data is unavailable. Confirm the collaboration database migration is installed.' });
    }
}

async function getMessages(req, res) {
    if (isProdUnavailable(res)) return;
    const campaignId = clean(req.params.campaignId, 100);
    try {
        if (!await canAccessCampaign(await campaignById(campaignId), req.user.id)) {
            return res.status(404).json({ error: 'Campaign not found.' });
        }
    } catch (error) {
        return res.status(503).json({ error: 'Campaign access could not be verified.' });
    }
    if (!supabase) {
        const messages = memoryDb.campaign_messages.filter(m => m.campaign_id === campaignId);
        // Map sender details
        const enriched = messages.map(m => {
            const user = memoryDb.users.find(u => u.id === m.sender_user_id);
            return { ...m, sender_name: user ? user.name : 'Unknown' };
        });
        return res.json({ messages: enriched });
    }
    try {
        const { data, error } = await supabase
            .from('campaign_messages')
            .select('*, users!sender_user_id(name)')
            .eq('campaign_id', campaignId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        const enriched = data.map(m => ({ ...m, sender_name: m.users?.name || 'Unknown' }));
        return res.json({ messages: enriched });
    } catch (error) {
        return res.status(503).json({ error: 'Messages could not be loaded.' });
    }
}

async function addMessage(req, res) {
    if (isProdUnavailable(res)) return;
    const campaignId = clean(req.params.campaignId, 100);
    const content = clean(req.body?.content, 2000);
    if (!content || content.length === 0) return res.status(400).json({ error: 'Message content is required.' });
    
    try {
        if (!await canAccessCampaign(await campaignById(campaignId), req.user.id)) {
            return res.status(404).json({ error: 'Campaign not found.' });
        }
        const message = await insert('campaign_messages', {
            id: id('msg'),
            campaign_id: campaignId,
            sender_user_id: req.user.id,
            content,
            created_at: new Date().toISOString()
        });
        
        let senderName = 'Unknown';
        if (!supabase) {
            const user = memoryDb.users.find(u => u.id === req.user.id);
            if (user) senderName = user.name;
        } else {
            const { data } = await supabase.from('users').select('name').eq('id', req.user.id).single();
            if (data) senderName = data.name;
        }
        
        return res.status(201).json({ message: { ...message, sender_name: senderName } });
    } catch (error) {
        console.error('[ADD MESSAGE]', error.message);
        return res.status(503).json({ error: 'The message could not be sent or campaign access could not be verified.' });
    }
}

module.exports = {
    createOrganization,
    inviteMember,
    listInvitations,
    getInvitation,
    acceptInvitation,
    createCampaign,
    assignCreator,
    acceptAssignment,
    createMilestone,
    getWorkspace,
    getMessages,
    addMessage,
    campaignById,
    membership,
    canAccessCampaign
};
