'use strict';

(function() {
    const sessionToken = sessionStorage.getItem('ccf_session') || localStorage.getItem('ccf_session');
    if (!sessionToken) { window.location.href = '/#login'; return; }
    
    function parseJwt(token) {
        try { return JSON.parse(atob(token.split('.')[1])); } catch (e) { return null; }
    }
    
    const user = parseJwt(sessionToken);
    if (!user || (user.role !== 'agency' && user.role !== 'brand')) {
        window.location.href = '/#login';
        return;
    }

    const state = {
        tab: 'overview',
        workspace: null,
        brandRequests: [],
        brandRequestsError: '',
        campaignDetails: {},
        pendingInvitations: [],
        showInvite: false,
        loading: true,
        error: null
    };

    const DOM = {
        shell: document.querySelector('.role-workspace-shell')
    };

    function money(amount) {
        return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(amount || 0);
    }

    const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

    function campaignHandoff(campaign) {
        const detail = state.campaignDetails[campaign.id];
        if (!detail) return { label: 'Open campaign', owner: 'Status available inside the campaign', priority: 3 };
        const deliverables = detail.deliverables || [];
        if (deliverables.some(item => item.status === 'submitted')) return {
            label: 'Draft awaiting review', owner: 'Your review', priority: 0
        };
        if (user.role === 'agency') {
            if (!(detail.assignments || []).length) return { label: 'Assign a creator', owner: 'Agency action', priority: 0 };
            if (!(detail.assignments || []).some(item => item.consent_status === 'accepted')) return { label: 'Creator acceptance pending', owner: 'Waiting on creator', priority: 1 };
            if (!deliverables.length) return { label: 'Add the first deliverable', owner: 'Agency action', priority: 0 };
        }
        if (deliverables.some(item => item.status === 'revision')) return { label: 'Revision requested', owner: 'Waiting on creator', priority: 1 };
        if (deliverables.some(item => item.status === 'planned')) return { label: 'Draft not yet submitted', owner: 'Waiting on creator', priority: 1 };
        if (deliverables.some(item => item.status === 'approved')) return { label: 'Approved · awaiting published link', owner: 'Waiting on creator', priority: 1 };
        if (deliverables.length && deliverables.every(item => item.status === 'published')) return { label: 'Published links recorded', owner: 'No review pending', priority: 2 };
        return { label: 'Review campaign progress', owner: 'Open the campaign file', priority: 2 };
    }

    function queueRow(campaign) {
        const handoff = campaignHandoff(campaign);
        return `<a class="cd-queue-row" href="/campaign.html?id=${encodeURIComponent(campaign.id)}">
            <span class="cd-queue-title"><strong>${escape(campaign.name)}</strong><small>${escape(campaign.brief || 'Open the campaign file for its brief.')}</small></span>
            <span class="cd-queue-state"><strong>${escape(handoff.label)}</strong><small>${escape(handoff.owner)}</small></span>
            <svg class="cd-queue-arrow" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 19 19 5M8 5h11v11"/></svg>
        </a>`;
    }

    async function loadWorkspace() {
        try {
            const res = await fetch('/api/collaboration/workspace', {
                headers: { 'Authorization': 'Bearer ' + sessionToken }
            });
            if (!res.ok) throw new Error('Failed to load workspace data');
            state.workspace = await res.json();
            const campaigns = (state.workspace.campaigns || []).slice(0, 30);
            const details = await Promise.all(campaigns.map(async campaign => {
                try {
                    const response = await fetch('/api/collaboration/campaigns/' + encodeURIComponent(campaign.id), {
                        headers: { Authorization: 'Bearer ' + sessionToken }
                    });
                    return response.ok ? [campaign.id, await response.json()] : null;
                } catch (_) { return null; }
            }));
            state.campaignDetails = Object.fromEntries(details.filter(Boolean));
            if (user.role === 'brand') {
                const pending = await fetch('/api/collaboration/brand-requests', { headers: { Authorization: 'Bearer ' + sessionToken } });
                if (pending.ok) state.brandRequests = (await pending.json()).requests || [];
                else state.brandRequestsError = 'Brand requests are unavailable until the workflow database update is installed.';
            }

            const primaryOrg = state.workspace?.organizations?.[0]?.id;
            if (primaryOrg) {
                try {
                    const invRes = await fetch('/api/collaboration/organizations/' + encodeURIComponent(primaryOrg) + '/invitations', {
                        headers: { Authorization: 'Bearer ' + sessionToken }
                    });
                    if (invRes.ok) {
                        state.pendingInvitations = (await invRes.json()).invitations || [];
                    }
                } catch (_) {}
            }
            
        } catch (err) {
            state.error = err.message;
        } finally {
            state.loading = false;
            render();
        }
    }

    function renderNav() {
        const orgName = state.workspace?.organizations?.[0]?.name || user.name || 'Workspace';
        const items = user.role === 'agency'
            ? [['overview', 'Work'], ['campaigns', 'Campaigns'], ['roster', 'People']]
            : [['overview', 'Work'], ['campaigns', 'Campaigns'], ['approvals', 'Reviews']];
        return `<nav class="role-rail" aria-label="Workspace views">
            <span class="cd-rail-org">${escape(orgName)}</span>
            ${items.map(([tab, title]) => `<button type="button" class="${state.tab === tab ? 'is-active' : ''}" data-tab="${tab}" ${state.tab === tab ? 'aria-current="page"' : ''}>${title}</button>`).join('')}
            <p class="cd-rail-note">${user.role === 'agency' ? 'The next decision, in one place.' : 'Review only what is shared with your brand.'}</p>
        </nav>`;
    }

    function renderAgencyOverview() {
        const campaigns = (state.workspace?.campaigns || []).toSorted((a, b) => campaignHandoff(a).priority - campaignHandoff(b).priority);
        const queue = campaigns.length
            ? campaigns.map(queueRow).join('')
            : '<div class="cd-empty"><h2>Start with one real campaign.</h2><p>Add a brief, then bring in a registered creator and a brand reviewer when the work is ready.</p><button class="cc-btn cc-primary" type="button" data-open-campaigns>Create the first campaign</button></div>';
        return `<header class="cd-page-head"><div><h1>Work needing a decision</h1><p>Every campaign has a next move. Start with the work that can move now.</p></div><button class="cc-btn cc-primary" type="button" data-open-campaigns>New campaign</button></header>
            <section class="cd-work-layout" aria-label="Agency campaign desk">
                <div class="cd-work-main"><div class="cd-section-heading"><h2>Campaign queue</h2><span>${campaigns.length} ${campaigns.length === 1 ? 'campaign' : 'campaigns'}</span></div><div class="cd-queue">${queue}</div></div>
                <aside class="cd-context"><h2>How work moves</h2><ol class="cd-flow"><li><strong>Set the brief</strong><span>Define the work in one campaign record.</span></li><li><strong>Assign the creator</strong><span>The creator accepts before sharing a draft.</span></li><li><strong>Review and publish</strong><span>Record the decision, link and labelled result.</span></li></ol><p>Money movement and platform-verified campaign reporting are not part of this pilot.</p></aside>
            </section>`;
    }

    function renderBrandOverview() {
        const brandOrg = (state.workspace?.organizations || []).find(org => org.type === 'brand');
        const campaigns = (state.workspace?.campaigns || []).toSorted((a, b) => campaignHandoff(a).priority - campaignHandoff(b).priority);
        const requests = state.brandRequests.map(item => `<article class="cd-request"><div><h3>${escape(item.campaign_name)}</h3><p>An agency asked this brand workspace to review the brief and submitted deliverables.</p></div><div class="cd-request-actions"><button class="cc-btn cc-primary" type="button" data-brand-request="${escape(item.id)}" data-brand-decision="accepted">Accept access</button><button class="cc-btn" type="button" data-brand-request="${escape(item.id)}" data-brand-decision="declined">Decline</button></div></article>`).join('');
        return `<header class="cd-page-head"><div><h1>Decisions waiting for your brand</h1><p>Review access and content in the context of the campaign. Nothing outside a shared campaign is visible here.</p></div></header>
            <section class="cd-work-layout" aria-label="Brand review desk"><div class="cd-work-main">
                <div class="cd-section-heading"><h2>Access requests</h2><span>${state.brandRequests.length} pending</span></div>
                ${state.brandRequestsError ? `<p role="alert">${escape(state.brandRequestsError)}</p>` : requests || '<p class="cd-quiet">No access requests are waiting.</p>'}
                <div class="cd-section-heading cd-section-spaced"><h2>Shared campaigns</h2><span>${campaigns.length} available</span></div>
                <div class="cd-queue">${campaigns.length ? campaigns.map(queueRow).join('') : '<p class="cd-quiet">Once you accept a campaign request, it will appear here.</p>'}</div>
            </div><aside class="cd-context"><h2>Your review boundary</h2><p>Only accept access to campaigns this brand should review. Draft decisions and published links remain attached to their campaign.</p><div class="cd-workspace-id"><span>Brand workspace ID</span><strong>${brandOrg ? escape(brandOrg.id) : 'Unavailable'}</strong><small>Share this with an agency only when you want it to request access.</small></div></aside></section>`;
    }

    function renderCampaigns() {
        const campaigns = state.workspace?.campaigns || [];
        const agencyOrgs = (state.workspace?.organizations || []).filter(org => org.type === 'agency');
        const createForm = user.role === 'agency' ? `<section class="cd-create"><div><h2>Start a campaign</h2><p>A clear brief gives every participant the same starting point. You can add the creator and brand after creation.</p></div><form id="agency-create-campaign" class="cd-create-form"><label>Campaign name<input name="name" required minlength="2" maxlength="160" autocomplete="off"></label><label>Brief<textarea name="brief" maxlength="4000" rows="4" placeholder="What needs to be made, by whom, and for when?"></textarea></label><div class="cd-form-pair"><label>Agreed creator fee (ZAR)<input name="fixedFee" type="number" min="0" step="0.01" value="0"></label><label>Agency<select name="organizationId" required>${agencyOrgs.map(org => `<option value="${escape(org.id)}">${escape(org.name)}</option>`).join('')}</select></label></div><button class="cc-btn cc-primary" type="submit" ${agencyOrgs.length ? '' : 'disabled'}>Create campaign</button><p id="campaign-create-status" role="status" aria-live="polite"></p>${agencyOrgs.length ? '' : '<p>Create an agency organisation before starting a campaign.</p>'}</form></section>` : '';
        return `<header class="cd-page-head"><div><h1>Campaigns</h1><p>A shared record from brief to published link.</p></div></header>${createForm}<section class="cd-all-campaigns"><div class="cd-section-heading"><h2>All campaigns</h2><span>${campaigns.length} total</span></div><div class="cd-queue">${campaigns.length ? campaigns.map(queueRow).join('') : '<p class="cd-quiet">No campaigns are linked to this workspace yet.</p>'}</div></section>`;
    }

    function renderRoster() {
        const assignments = state.workspace?.assignments || [];
        const agencyOrgs = (state.workspace?.organizations || []).filter(org => org.type === 'agency');
        const invitations = state.pendingInvitations || [];

        const inviteSection = agencyOrgs.length ? `
            <section class="cd-create" id="invite-section" style="${state.showInvite ? '' : 'display:none;'}">
                <div>
                    <h2>Invite team member or creator</h2>
                    <p>Send an invitation email with a secure link to join your workspace.</p>
                </div>
                <form id="agency-invite-member" class="cd-create-form">
                    <div class="cd-form-pair">
                        <label>Email address
                            <input name="email" type="email" required placeholder="collaborator@example.com" autocomplete="email">
                        </label>
                        <label>Role
                            <select name="role" required>
                                <option value="creator">Creator</option>
                                <option value="manager">Campaign Manager</option>
                                <option value="analyst">Analyst</option>
                                <option value="brand_viewer">Brand Reviewer</option>
                            </select>
                        </label>
                    </div>
                    <div class="cd-form-pair">
                        <label>Organisation
                            <select name="organizationId" required>
                                ${agencyOrgs.map(org => `<option value="${escape(org.id)}">${escape(org.name)}</option>`).join('')}
                            </select>
                        </label>
                        <div style="display: flex; align-items: flex-end; padding-bottom: 2px;">
                            <button class="cc-btn cc-primary" type="submit" style="width: 100%;">Send invitation &rarr;</button>
                        </div>
                    </div>
                    <div id="invite-create-status" role="status" aria-live="polite" style="margin-top: 10px; font-size: 13.5px; line-height: 1.4;"></div>
                </form>
            </section>` : '';

        const pendingList = invitations.filter(i => i.status === 'pending').length ? `
            <div class="cd-section-heading cd-section-spaced">
                <h2>Pending invitations</h2>
                <span>${invitations.filter(i => i.status === 'pending').length} pending</span>
            </div>
            <div class="cd-queue">
                ${invitations.filter(i => i.status === 'pending').map(inv => `
                    <div class="cd-queue-row" style="cursor: default;">
                        <span class="cd-queue-title">
                            <strong>${escape(inv.email)}</strong>
                            <small>Role: ${escape(inv.role)} · Invited ${new Date(inv.created_at).toLocaleDateString()}</small>
                        </span>
                        <span class="cd-queue-state">
                            <span class="cd-badge" style="background: rgba(255, 91, 0, 0.12); color: #ff5b00; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase;">Pending</span>
                            <small>Expires ${new Date(inv.expires_at).toLocaleDateString()}</small>
                        </span>
                    </div>
                `).join('')}
            </div>` : '';

        return `<header class="cd-page-head">
            <div>
                <h1>People in campaigns</h1>
                <p>Manage your creators and team collaborators.</p>
            </div>
            ${agencyOrgs.length ? `<button class="cc-btn cc-primary" type="button" data-toggle-invite>${state.showInvite ? 'Close form' : '+ Invite member'}</button>` : ''}
        </header>
        ${inviteSection}
        <section class="cd-all-campaigns">
            <div class="cd-section-heading"><h2>Active creator assignments</h2><span>${assignments.length} total</span></div>
            <div class="cd-queue">${assignments.length ? assignments.map(a => `<a class="cd-queue-row" href="/campaign.html?id=${encodeURIComponent(a.campaign_id)}"><span class="cd-queue-title"><strong>Creator ${escape(a.creator_user_id)}</strong><small>Campaign ${escape(a.campaign_id)}</small></span><span class="cd-queue-state"><strong>${escape(a.consent_status === 'accepted' ? 'Accepted' : 'Awaiting acceptance')}</strong><small>Open the campaign to see the work</small></span></a>`).join('') : '<div class="cd-empty"><h2>No creator assignments yet.</h2><p>Open a campaign to assign someone who has a CCF account, or invite them above.</p><button class="cc-btn cc-primary" type="button" data-open-campaigns>View campaigns</button></div>'}</div>
            ${pendingList}
        </section>`;
    }

    function renderApprovals() {
        const waiting = (state.workspace?.campaigns || []).filter(campaign => (state.campaignDetails[campaign.id]?.deliverables || []).some(item => item.status === 'submitted'));
        return `<header class="cd-page-head"><div><h1>Reviews</h1><p>Submitted drafts need a recorded decision. Open the campaign to approve or request a change.</p></div></header><section class="cd-all-campaigns"><div class="cd-section-heading"><h2>Drafts awaiting review</h2><span>${waiting.length} ${waiting.length === 1 ? 'campaign' : 'campaigns'}</span></div><div class="cd-queue">${waiting.length ? waiting.map(queueRow).join('') : '<p class="cd-quiet">Nothing is waiting for review right now.</p>'}</div></section>`;
    }

    function renderContent() {
        let body = '';
        if (user.role === 'agency') {
            if (state.tab === 'overview') body = renderAgencyOverview();
            else if (state.tab === 'campaigns') body = renderCampaigns();
            else if (state.tab === 'roster') body = renderRoster();
        } else {
            if (state.tab === 'overview') body = renderBrandOverview();
            else if (state.tab === 'campaigns') body = renderCampaigns();
            else if (state.tab === 'approvals') body = renderApprovals();
        }

        return `<section class="role-content">${body}</section>`;
    }

    function render() {
        if (!DOM.shell) return;
        if (state.loading) {
            DOM.shell.innerHTML = '<div style="padding: 48px; color: var(--st-line); text-align: center;">Loading workspace...</div>';
            return;
        }
        if (state.error) {
            DOM.shell.innerHTML = `<div style="padding: 48px; color: var(--st-primary); text-align: center;">Error: ${state.error}</div>`;
            return;
        }

        DOM.shell.innerHTML = renderNav() + renderContent();

        DOM.shell.querySelectorAll('[data-open-campaigns]').forEach(button => button.addEventListener('click', () => { state.tab = 'campaigns'; render(); }));
        DOM.shell.querySelectorAll('[data-brand-request]').forEach(button => button.addEventListener('click', async () => {
            button.disabled = true;
            const original = button.textContent;
            button.textContent = 'Saving…';
            try {
                const response = await fetch('/api/collaboration/brand-requests/' + encodeURIComponent(button.dataset.brandRequest) + '/respond', { method: 'POST', headers: { Authorization: 'Bearer ' + sessionToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ decision: button.dataset.brandDecision }) });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Decision could not be saved.');
                state.brandRequests = state.brandRequests.filter(item => item.id !== button.dataset.brandRequest);
                await loadWorkspace();
            } catch (cause) { button.disabled = false; button.textContent = original; alert(cause.message); }
        }));
        DOM.shell.querySelector('#agency-create-campaign')?.addEventListener('submit', async event => {
            event.preventDefault();
            const form = event.currentTarget;
            const button = form.querySelector('button[type="submit"]');
            const status = form.querySelector('#campaign-create-status');
            button.disabled = true;
            status.textContent = 'Creating campaign…';
            try {
                const response = await fetch('/api/collaboration/campaigns', { method: 'POST', headers: { Authorization: 'Bearer ' + sessionToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId: form.elements.organizationId.value, name: form.elements.name.value.trim(), brief: form.elements.brief.value.trim(), fixedFee: Number(form.elements.fixedFee.value) }) });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Campaign could not be created.');
                window.location.href = '/campaign.html?id=' + encodeURIComponent(data.campaign.id);
            } catch (cause) { status.textContent = cause.message; button.disabled = false; }
        });

        DOM.shell.querySelectorAll('[data-toggle-invite]').forEach(btn => {
            btn.addEventListener('click', () => {
                state.showInvite = !state.showInvite;
                render();
            });
        });

        DOM.shell.querySelector('#agency-invite-member')?.addEventListener('submit', async event => {
            event.preventDefault();
            const form = event.currentTarget;
            const btn = form.querySelector('button[type="submit"]');
            const status = form.querySelector('#invite-create-status');
            btn.disabled = true;
            status.style.color = '#64748b';
            status.textContent = 'Sending invitation…';
            try {
                const orgId = form.elements.organizationId.value;
                const email = form.elements.email.value.trim();
                const role = form.elements.role.value;
                const res = await fetch('/api/collaboration/organizations/' + encodeURIComponent(orgId) + '/invitations', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + sessionToken,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, role })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to send invitation.');
                
                form.elements.email.value = '';
                btn.disabled = false;
                
                let msg = `Invitation created for ${escape(email)}!`;
                if (data.delivery === 'sent') {
                    msg = `Invitation email sent via Resend to <strong>${escape(email)}</strong>!`;
                }
                if (data.inviteUrl) {
                    msg += `<br/><span style="color:#64748b; font-size:12px;">Direct link: <a href="${data.inviteUrl}" target="_blank" style="color:#ff5b00;">${data.inviteUrl}</a></span>`;
                }
                status.style.color = '#15803d';
                status.innerHTML = msg;

                if (state.workspace?.organizations?.[0]?.id) {
                    const invRes = await fetch('/api/collaboration/organizations/' + encodeURIComponent(state.workspace.organizations[0].id) + '/invitations', {
                        headers: { Authorization: 'Bearer ' + sessionToken }
                    });
                    if (invRes.ok) {
                        state.pendingInvitations = (await invRes.json()).invitations || [];
                    }
                }
            } catch (cause) {
                btn.disabled = false;
                status.style.color = '#dc2626';
                status.textContent = cause.message;
            }
        });

        // Attach event listeners to tabs
        DOM.shell.querySelectorAll('.role-rail button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                if (tab && tab !== state.tab) {
                    state.tab = tab;
                    render();
                }
            });
        });
    }

    // Export globally for the invite modal to access
    window.CCFDashboards = {
        reload: loadWorkspace
    };

    // Initial load
    loadWorkspace();
})();
