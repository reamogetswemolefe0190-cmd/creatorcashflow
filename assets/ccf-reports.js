'use strict';

window.CCFReports = (() => {
    const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    const humanDate = value => new Date(value).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
    let context;
    let selectedCampaign;

    function postRow(index) {
        return `<fieldset class="ccf-report-post" data-post-row><legend>Published post ${index}</legend>
            <label>Content label<input name="post-label" maxlength="80" placeholder="e.g. Launch Reel"></label>
            <label>Post link<input name="post-url" type="url" inputmode="url" placeholder="https://www.instagram.com/p/..." maxlength="500"></label>
            <label>Published on<input name="published-on" type="date"></label>
            <div class="ccf-report-metrics">
                ${['reach','views','likes','comments','shares','saves'].map(metric => `<label>${metric[0].toUpperCase() + metric.slice(1)}<input name="metric-${metric}" type="number" min="0" max="1000000000000" step="1" inputmode="numeric" placeholder="—"></label>`).join('')}
            </div>
            <label>Results as of<input name="results-as-of" type="date"></label>
            <p>Numbers entered here are labelled “Manually supplied by agency” in both reports.</p>
            <button type="button" class="ccf-report-remove" data-remove-post>Remove post</button>
        </fieldset>`;
    }

    function render() {
        const { root, campaigns, role } = context;
        if (!campaigns.length) {
            root.innerHTML = `<div class="ccf-reports"><div class="ccf-reports-head"><span class="cc-kicker">Campaign records</span><h1>Campaign reports</h1><p>Reports become available when a campaign is linked to your organization.</p></div></div>`;
            return;
        }
        selectedCampaign = campaigns.some(c => c.id === selectedCampaign) ? selectedCampaign : campaigns[0].id;
        const linkedBrand = Boolean(campaigns.find(c => c.id === selectedCampaign)?.brand_organization_id);
        root.innerHTML = `<div class="ccf-reports">
            <div class="ccf-reports-head"><span class="cc-kicker">Campaign records</span><h1>Campaign reports</h1><p>${role === 'agency' ? 'Create a dated decision brief for your team and any linked brand.' : 'Download the campaign report prepared by your agency.'}</p></div>
            <div class="ccf-report-panel"><label for="ccf-report-campaign">Campaign</label><select id="ccf-report-campaign">${campaigns.map(c => `<option value="${escape(c.id)}" ${c.id === selectedCampaign ? 'selected' : ''}>${escape(c.name)}</option>`).join('')}</select></div>
            ${role === 'agency' ? `<form id="ccf-report-form" class="ccf-report-panel">
                <div class="ccf-report-panel-head"><div><span class="cc-kicker">Prepare a snapshot</span><h2>Create a report</h2></div><span class="ccf-report-badge">Agency review</span></div>
                <p id="ccf-report-sharing-note">Review the summary and results before creating. ${linkedBrand ? 'The linked brand can download the client version after you save it.' : 'An agency PDF is available now. Brand access requires a linked brand organization.'}</p>
                <div class="ccf-report-section-intro"><span class="cc-kicker">01 / The story</span><h3>Give the results context</h3><p>Write for a client seeing this campaign for the first time. Distinguish what happened from what the numbers suggest.</p></div>
                <label>Campaign objective <span class="ccf-report-required">Required</span><textarea name="objective" rows="2" minlength="15" maxlength="800" required placeholder="What was the campaign trying to achieve for the brand?"></textarea></label>
                <label>Success measure or benchmark <span class="ccf-report-private">Optional</span><textarea name="successMeasure" rows="2" maxlength="500" placeholder="What agreed target or previous result should this be compared with? Leave blank if none exists."></textarea></label>
                <label>Headline takeaway <span class="ccf-report-required">Required</span><textarea name="summary" rows="2" minlength="10" maxlength="2000" required placeholder="One sentence the client should remember."></textarea></label>
                <label>What the evidence means <span class="ccf-report-required">Required</span><textarea name="interpretation" rows="4" minlength="20" maxlength="1200" required placeholder="Explain the result, its limits, and any gap against the goal. Do not claim a lift or ROI without a comparison."></textarea></label>
                <div class="ccf-report-section-intro"><span class="cc-kicker">02 / The evidence</span><h3>Attach published work</h3><p>Add the links, publication dates and results you have. Leave missing metrics empty instead of estimating them.</p></div>
                <div class="ccf-report-posts" id="ccf-report-posts">${postRow(1)}</div>
                <button type="button" class="cc-btn ccf-report-add" id="ccf-report-add">Add another post</button>
                <div class="ccf-report-section-intro"><span class="cc-kicker">03 / The decision</span><h3>Say what happens next</h3></div>
                <label>Recommended next step <span class="ccf-report-required">Required</span><textarea name="nextStep" rows="2" minlength="15" maxlength="800" required placeholder="Name the action, owner or timing where possible."></textarea></label>
                <label>Decision needed from the brand <span class="ccf-report-private">Optional</span><textarea name="decisionNeeded" rows="2" maxlength="500" placeholder="What should the client approve, change or discuss?"></textarea></label>
                <label>Agency notes <span class="ccf-report-private">Only in the agency PDF</span><textarea name="internalNotes" rows="3" maxlength="1000" placeholder="Internal follow-up or observations"></textarea></label>
                <div class="ccf-report-actions"><button class="cc-btn cc-primary" type="submit">Create report</button><span id="ccf-report-status" role="status" aria-live="polite"></span></div>
            </form>` : ''}
            <section class="ccf-report-panel" aria-labelledby="ccf-saved-heading"><div class="ccf-report-panel-head"><div><span class="cc-kicker">Dated copies</span><h2 id="ccf-saved-heading">Available reports</h2></div></div><div id="ccf-report-list" aria-live="polite">Loading reports…</div></section>
        </div>`;
        root.querySelector('#ccf-report-campaign').addEventListener('change', event => {
            selectedCampaign = event.target.value;
            const note = root.querySelector('#ccf-report-sharing-note');
            if (note) note.textContent = context.campaigns.find(c => c.id === selectedCampaign)?.brand_organization_id
                ? 'Review the summary and results before creating. The linked brand can download the client version after you save it.'
                : 'Review the summary and results before creating. An agency PDF is available now. Brand access requires a linked brand organization.';
            loadList();
        });
        if (role === 'agency') {
            root.querySelector('#ccf-report-add').addEventListener('click', () => {
                const posts = root.querySelector('#ccf-report-posts');
                if (posts.children.length >= 20) return;
                posts.insertAdjacentHTML('beforeend', postRow(posts.children.length + 1));
            });
            root.querySelector('#ccf-report-posts').addEventListener('click', event => {
                if (event.target.closest('[data-remove-post]')) event.target.closest('[data-post-row]').remove();
            });
            root.querySelector('#ccf-report-form').addEventListener('submit', createReport);
        }
        root.querySelector('#ccf-report-list').addEventListener('click', event => {
            const button = event.target.closest('[data-download-report]');
            if (button) downloadReport(button);
        });
        loadList();
    }

    async function loadList() {
        const { root, token, role } = context;
        const list = root.querySelector('#ccf-report-list');
        const campaignId = selectedCampaign;
        list.textContent = 'Loading reports…';
        try {
            const response = await fetch(`/api/collaboration/campaigns/${encodeURIComponent(campaignId)}/reports`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await response.json();
            if (selectedCampaign !== campaignId) return;
            if (!response.ok) throw Error(data.error || 'Reports are unavailable.');
            list.innerHTML = data.reports.length ? data.reports.map(report => `<article class="ccf-report-item"><div><strong>${escape(humanDate(report.created_at))} report</strong><p>${escape(report.summary)}</p><small>${report.post_count} published post${report.post_count === 1 ? '' : 's'} included</small></div><button class="cc-btn" type="button" data-download-report="${escape(report.id)}">Download ${role === 'agency' ? 'agency' : 'brand'} PDF</button></article>`).join('') : `<p>${role === 'agency' ? 'No reports yet. Prepare the first campaign snapshot above.' : 'The agency has not shared a report for this campaign yet.'}</p>`;
        } catch (error) { list.textContent = error.message; }
    }

    async function createReport(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const button = form.querySelector('[type=submit]');
        const status = form.querySelector('#ccf-report-status');
        const posts = [...form.querySelectorAll('[data-post-row]')].map(row => {
            const input = name => row.querySelector(`[name="${name}"]`).value.trim();
            return { label: input('post-label'), url: input('post-url'), publishedOn: input('published-on'), asOf: input('results-as-of'), metrics: Object.fromEntries(['reach','views','likes','comments','shares','saves'].map(name => [name, input(`metric-${name}`)])) };
        }).filter(post => post.url || post.publishedOn || post.asOf || Object.values(post.metrics).some(Boolean));
        button.disabled = true; status.textContent = 'Creating report…';
        try {
            const response = await fetch(`/api/collaboration/campaigns/${encodeURIComponent(selectedCampaign)}/reports`, {
                method: 'POST', headers: { Authorization: `Bearer ${context.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    objective: form.elements.objective.value.trim(),
                    successMeasure: form.elements.successMeasure.value.trim(),
                    summary: form.elements.summary.value.trim(),
                    interpretation: form.elements.interpretation.value.trim(),
                    nextStep: form.elements.nextStep.value.trim(),
                    decisionNeeded: form.elements.decisionNeeded.value.trim(),
                    internalNotes: form.elements.internalNotes.value.trim(), posts
                })
            });
            const data = await response.json();
            if (!response.ok) throw Error(data.error || 'Report could not be created.');
            form.reset();
            status.textContent = context.campaigns.find(c => c.id === selectedCampaign)?.brand_organization_id
                ? 'Report saved. The linked brand can now download its version.'
                : 'Agency report saved. Link a brand organization to give its team access to the client version.';
            await loadList();
        } catch (error) { status.textContent = error.message; }
        finally { button.disabled = false; }
    }

    async function downloadReport(button) {
        const reportId = button.dataset.downloadReport;
        const campaignId = selectedCampaign;
        button.disabled = true; const original = button.textContent; button.textContent = 'Preparing PDF…';
        try {
            const response = await fetch(`/api/collaboration/campaigns/${encodeURIComponent(campaignId)}/reports/${encodeURIComponent(reportId)}/pdf`, { headers: { Authorization: `Bearer ${context.token}` } });
            if (!response.ok) { const data = await response.json(); throw Error(data.error || 'Download failed.'); }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const name = context.campaigns.find(c => c.id === campaignId)?.name || 'campaign';
            link.href = url; link.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${context.role}-report.pdf`;
            document.body.append(link); link.click(); link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 30000);
        } catch (error) { context.root.querySelector('#ccf-report-list').insertAdjacentHTML('afterbegin', `<p role="alert">${escape(error.message)}</p>`); }
        finally { button.disabled = false; button.textContent = original; }
    }

    return { mount(root, options) { context = { root, ...options }; selectedCampaign = null; render(); } };
})();
