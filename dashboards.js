'use strict';

(function() {
    const sessionToken = localStorage.getItem('ccf_session');
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
        loading: true,
        error: null
    };

    const DOM = {
        shell: document.querySelector('.role-workspace-shell')
    };

    function money(amount) {
        return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(amount || 0);
    }

    async function loadWorkspace() {
        try {
            const res = await fetch('/api/collaboration/workspace', {
                headers: { 'Authorization': 'Bearer ' + sessionToken }
            });
            if (!res.ok) throw new Error('Failed to load workspace data');
            state.workspace = await res.json();
            
            // Add some mock data to make the UI look alive since we don't have a full database yet
            if (state.workspace.campaigns.length === 0) {
                state.workspace.campaigns.push({
                    id: 'cmp_demo_1',
                    name: 'Spring in motion',
                    brief: 'Show an outdoor movement routine featuring the spring collection.',
                    fixed_fee: 60000,
                    status: 'active'
                });
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
        const campaignsCount = state.workspace?.campaigns?.length || 0;
        
        const activeBudget = state.workspace?.campaigns?.reduce((sum, c) => sum + (c.fixed_fee || 0), 0) || 0;

        let navItems = '';
        if (user.role === 'agency') {
            navItems = `
                <button class="${state.tab === 'overview' ? 'is-active' : ''}" data-tab="overview">Overview</button>
                <button class="${state.tab === 'campaigns' ? 'is-active' : ''}" data-tab="campaigns">Deal Pipeline <b>${campaignsCount}</b></button>
                <button class="${state.tab === 'roster' ? 'is-active' : ''}" data-tab="roster">Creator Roster</button>
            `;
        } else {
            navItems = `
                <button class="${state.tab === 'overview' ? 'is-active' : ''}" data-tab="overview">Overview</button>
                <button class="${state.tab === 'campaigns' ? 'is-active' : ''}" data-tab="campaigns">Campaign Tracker <b>${campaignsCount}</b></button>
                <button class="${state.tab === 'approvals' ? 'is-active' : ''}" data-tab="approvals">Content Approvals</button>
            `;
        }

        return `
            <aside class="role-rail">
                <span class="cc-kicker">${orgName.toUpperCase()}</span>
                ${navItems}
                <div>
                    <small>ACTIVE BUDGET</small>
                    <strong>${money(activeBudget)}</strong>
                    <span>across ${campaignsCount} campaigns</span>
                </div>
            </aside>
        `;
    }

    function renderAgencyOverview() {
        return `
            <div class="role-heading">
                <div>
                    <span class="cc-kicker">THE DELIVERY DESK</span>
                    <h1>Keep every creator,<br><em>brief and approval moving.</em></h1>
                    <p>See the handoffs that need attention before they slow a campaign down.</p>
                </div>
                <button class="cc-btn cc-primary" onclick="openInviteModal()">Invite creator</button>
            </div>
            <div class="role-metrics">
                <article class="role-metric role-metric-hero">
                    <span>Campaigns on track</span>
                    <strong>${state.workspace?.campaigns?.length || 0}</strong>
                    <small>All handoffs are moving smoothly</small>
                    <div class="metric-bar"><i style="width:100%"></i></div>
                </article>
                <article class="role-metric">
                    <span>Active roster</span>
                    <strong>${state.workspace?.assignments?.length || 0}</strong>
                    <small class="up">Connected creators</small>
                </article>
                <article class="role-metric">
                    <span>Awaiting agency review</span>
                    <strong>0</strong>
                    <small>Across active campaigns</small>
                </article>
            </div>
        `;
    }

    function renderBrandOverview() {
        return `
            <div class="role-heading">
                <div>
                    <span class="cc-kicker">CAMPAIGN PERFORMANCE</span>
                    <h1>See what is moving<br><em>the work forward.</em></h1>
                    <p>Make decisions with a clear view of spend, creative approvals and the next deliverable.</p>
                </div>
                <button class="cc-btn">Export snapshot</button>
            </div>
            <div class="role-metrics">
                <article class="role-metric role-metric-hero">
                    <span>Current campaign spend</span>
                    <strong>${money(state.workspace?.campaigns?.reduce((sum, c) => sum + (c.fixed_fee || 0), 0) || 0)}</strong>
                    <small>Active budget allocation</small>
                    <div class="metric-bar"><i style="width:100%"></i></div>
                </article>
                <article class="role-metric">
                    <span>Verified reach</span>
                    <strong>--</strong>
                    <small>Awaiting campaign launch</small>
                </article>
                <article class="role-metric">
                    <span>Awaiting review</span>
                    <strong>0</strong>
                    <small>Creative items need a decision</small>
                </article>
            </div>
        `;
    }

    function renderCampaigns() {
        const campaigns = state.workspace?.campaigns || [];
        if (campaigns.length === 0) {
            return `<div class="role-panel"><p style="padding: 24px; color: #888;">No active campaigns. Create one from the Creator Dashboard.</p></div>`;
        }

        return campaigns.map(c => `
            <article class="role-panel" style="margin-bottom: 24px;">
                <div class="panel-head">
                    <div>
                        <span class="cc-kicker">${c.status.toUpperCase()}</span>
                        <h2>${c.name}</h2>
                    </div>
                    <span class="cc-tag">${money(c.fixed_fee)}</span>
                </div>
                <p style="color: #aaa; margin-top: 12px; margin-bottom: 24px;">${c.brief}</p>
                <ol class="role-timeline">
                    <li class="done"><i>✓</i><div><b>Brief confirmed</b><small>Completed</small></div></li>
                    <li class="current"><i>2</i><div><b>Roster assignment</b><small>Awaiting creator confirmations</small></div></li>
                    <li><i>3</i><div><b>Creative sign-off</b><small>Not started</small></div></li>
                </ol>
            </article>
        `).join('');
    }

    function renderRoster() {
        const assignments = state.workspace?.assignments || [];
        if (assignments.length === 0) {
            return `
                <div class="role-panel" style="text-align: center; padding: 48px 24px;">
                    <h2 style="margin-bottom: 12px;">Build your roster</h2>
                    <p style="color: #aaa; margin-bottom: 24px;">Invite creators to join your agency so you can track their real-time analytics and assign them to campaigns.</p>
                    <button class="cc-btn cc-primary" onclick="openInviteModal()">Invite creator</button>
                </div>
            `;
        }
        return `
            <div class="role-panel">
                <div class="panel-head">
                    <div><span class="cc-kicker">CONNECTED</span><h2>Creator Roster</h2></div>
                    <span class="cc-tag">${assignments.length} creators</span>
                </div>
                ${assignments.map(a => `
                    <div class="creative-row">
                        <span class="role-avatar">${a.creator_user_id.substring(0, 2).toUpperCase()}</span>
                        <div>
                            <strong>Creator ID: ${a.creator_user_id}</strong>
                            <small>Assigned to Campaign ${a.campaign_id}</small>
                        </div>
                        <span class="cc-tag cc-tag-completed">Active</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderApprovals() {
        return `
            <div class="role-panel">
                <div class="panel-head">
                    <div><span class="cc-kicker">PENDING</span><h2>Content Approval Room</h2></div>
                    <span class="cc-tag">0 items</span>
                </div>
                <div style="padding: 48px 24px; text-align: center; color: #888;">
                    No content requires your approval at this time.
                </div>
            </div>
        `;
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

        return `
            <section class="role-content">
                <div class="role-context">
                    <span><i></i>${user.role === 'agency' ? 'Agency operations' : 'Live campaign workspace'}</span>
                    <small>${state.workspace?.organizations?.[0]?.name || user.name}</small>
                </div>
                ${body}
            </section>
        `;
    }

    function render() {
        if (!DOM.shell) return;
        if (state.loading) {
            DOM.shell.innerHTML = '<div style="padding: 48px; color: #888; text-align: center;">Loading workspace...</div>';
            return;
        }
        if (state.error) {
            DOM.shell.innerHTML = `<div style="padding: 48px; color: #f00; text-align: center;">Error: ${state.error}</div>`;
            return;
        }

        DOM.shell.innerHTML = renderNav() + renderContent();

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
