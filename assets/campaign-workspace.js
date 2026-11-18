'use strict';

(() => {
  const root = document.getElementById('campaign-root');
  const token = sessionStorage.getItem('ccf_session') || localStorage.getItem('ccf_session');
  const campaignId = new URLSearchParams(location.search).get('id');
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  let user;
  try { user = JSON.parse(atob(token.split('.')[1])); } catch (_) { user = null; }
  if (!token || !user || !campaignId) {
    root.innerHTML = '<section class="campaign-card"><h1>Open a campaign from your workspace</h1><p>Sign in to see a campaign you belong to.</p><a href="/#login">Sign in</a></section>';
    return;
  }
  const back = document.getElementById('campaign-back');
  back.href = user.role === 'agency' ? '/agency.html' : user.role === 'brand' ? '/brand.html' : '/#account';
  const base = `/api/collaboration/campaigns/${encodeURIComponent(campaignId)}`;
  let model = null;
  let feedback = '';
  let error = false;

  async function api(path = '', body) {
    const response = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: 'Bearer ' + token, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'The action could not be completed.');
    return data;
  }

  const nextAction = item => ({ planned: 'Creator submits draft', submitted: 'Reviewer decides', revision: 'Creator revises draft', approved: 'Creator publishes', published: 'Published-post link recorded' }[item.status] || 'Review status');
  const label = value => ({ planned: 'Planned', submitted: 'Awaiting review', revision: 'Changes requested', approved: 'Approved', published: 'Published' }[value] || value);
  const safeLink = value => {
    try {
      const url = new URL(value, location.origin);
      const isMedia = url.protocol === 'https:' || url.protocol === 'http:' || value.startsWith('/uploads/');
      if (!isMedia) return '';
      const href = url.href;
      const lower = href.toLowerCase();
      if (lower.match(/\.(png|jpe?g|webp|gif)(\?.*)?$/)) {
        return `<div class="cd-media-preview" style="margin: 8px 0;"><img src="${escape(href)}" alt="Deliverable visual" style="max-width:100%; max-height:360px; border-radius:10px; display:block; border:1px solid #e2e8f0; object-fit:contain;" /></div><a class="campaign-link" href="${escape(href)}" target="_blank" rel="noopener noreferrer">View full image ↗</a>`;
      }
      if (lower.match(/\.(mp4|mov|webm)(\?.*)?$/)) {
        return `<div class="cd-media-preview" style="margin: 8px 0;"><video controls src="${escape(href)}" style="max-width:100%; max-height:360px; border-radius:10px; display:block; background:#000;"></video></div><a class="campaign-link" href="${escape(href)}" target="_blank" rel="noopener noreferrer">Open video file ↗</a>`;
      }
      return `<a class="campaign-link" href="${escape(href)}" target="_blank" rel="noopener noreferrer">Open attached link ↗</a>`;
    } catch (_) { return ''; }
  };

  function actionForm(item) {
    const creator = item.creator_user_id === user.id;
    const agency = user.role === 'agency';
    const brand = user.role === 'brand';
    if (creator && (item.status === 'planned' || item.status === 'revision')) return `
      <form class="campaign-form" data-transition="submit" data-id="${escape(item.id)}">
        <label>Upload draft video or image (MP4, MOV, PNG, JPG)
          <input type="file" accept="video/mp4,video/quicktime,video/webm,image/png,image/jpeg,image/webp,application/pdf" data-file-upload="${escape(item.id)}" style="margin-top:6px; display:block; font-size:13px;">
          <small id="upload-status-${escape(item.id)}" style="display:block; margin-top:4px; font-size:12px; color:#64748b;"></small>
        </label>
        <label>Or enter content URL
          <input name="contentUrl" id="content-url-${escape(item.id)}" type="url" placeholder="https://…" autocomplete="url">
        </label>
        <button class="primary" type="submit">Submit for review &rarr;</button>
      </form>`;
    if ((agency || brand) && item.status === 'submitted') return `
      <div class="campaign-actions"><button class="primary" type="button" data-decision="approve" data-id="${escape(item.id)}">Approve draft</button></div>
      <form class="campaign-form" data-transition="request_revision" data-id="${escape(item.id)}">
        <label>What needs to change?<textarea name="note" required minlength="3" maxlength="1000"></textarea></label>
        <button type="submit">Request changes</button>
      </form>`;
    if (creator && item.status === 'approved') return `
      <form class="campaign-form" data-transition="publish" data-id="${escape(item.id)}">
        <label>Published post link<input name="contentUrl" type="url" required pattern="https://.*" placeholder="https://…" autocomplete="url"></label>
        <button class="primary" type="submit">Record published post</button>
      </form>`;
    return '';
  }

  function render() {
    if (!model) return;
    const { campaign, deliverables, events, metrics = [], assignments, brandRequests = [] } = model;
    const isAgency = user.role === 'agency';
    const accepted = assignments.filter(item => item.consent_status === 'accepted');
    const awaitingReview = deliverables.find(item => item.status === 'submitted');
    const creatorWork = deliverables.find(item => item.creator_user_id === user.id && ['planned', 'revision', 'approved'].includes(item.status));
    const focus = awaitingReview && user.role !== 'creator' ? { title: 'A draft needs a decision', detail: awaitingReview.title, owner: isAgency ? 'Agency reviewer' : 'Brand reviewer' }
      : creatorWork ? { title: nextAction(creatorWork), detail: creatorWork.title, owner: 'Creator' }
      : isAgency && !assignments.length ? { title: 'Assign a creator', detail: 'Once a creator accepts, you can set up deliverables.', owner: 'Agency' }
      : isAgency && !deliverables.length ? { title: 'Add the first deliverable', detail: 'Define what the creator will submit.', owner: 'Agency' }
      : deliverables.length && deliverables.every(item => item.status === 'published') ? { title: 'Published links recorded', detail: 'Review manually entered results below.', owner: 'Campaign record' }
      : { title: 'The next step is with a participant', detail: 'Open a deliverable to check its current status.', owner: 'Shared campaign' };
    const focusHref = awaitingReview && user.role !== 'creator' ? `#deliverable-${encodeURIComponent(awaitingReview.id)}` : '#campaign-deliverables';
    const focusCta = awaitingReview && user.role !== 'creator' ? 'Review draft' : 'View deliverables';
    const deliverableMarkup = deliverables.length ? deliverables.map(item => {
      const latest = new Map();
      metrics.filter(metric => metric.deliverable_id === item.id).sort((a, b) => a.captured_at.localeCompare(b.captured_at)).forEach(metric => latest.set(metric.metric_name, metric));
      const stage = ({ planned: 0, revision: 0, submitted: 1, approved: 2, published: 3 })[item.status] ?? 0;
      return `
      <article class="cd-deliverable" id="deliverable-${escape(item.id)}">
        <div class="cd-deliverable-head"><div><h3>${escape(item.title)}</h3><p>${escape(item.platform)}${item.due_at ? ` · Due ${escape(new Date(item.due_at).toLocaleDateString('en-ZA'))}` : ''}</p></div><span class="campaign-pill">${escape(label(item.status))}</span></div>
        <ol class="cd-stage-rail" aria-label="Deliverable progress">${['Draft', 'Review', 'Approved', 'Published'].map((name, index) => `<li class="${index < stage ? 'is-done' : index === stage ? 'is-current' : ''}" ${index === stage ? 'aria-current="step"' : ''}>${name}</li>`).join('')}</ol>
        <p class="cd-next-line"><strong>Next:</strong> ${escape(nextAction(item))}</p>
        ${item.content_url ? `<p class="cd-attached-link">${safeLink(item.content_url)}</p>` : ''}
        ${latest.size ? `<div class="cd-results"><div><strong>Recorded results</strong><small>Participant-entered · not platform-verified</small></div><ul>${Array.from(latest.values()).map(metric => `<li><span>${escape(metric.metric_name)}</span><strong>${escape(Number(metric.metric_value).toLocaleString('en-ZA'))}</strong><small>${escape(new Date(metric.captured_at).toLocaleDateString('en-ZA'))}</small></li>`).join('')}</ul></div>` : ''}
        ${actionForm(item)}
        ${item.status === 'published' && (isAgency || item.creator_user_id === user.id) ? `<details class="cd-inline-details"><summary>Add a manual result</summary><form class="campaign-form" data-metric="${escape(item.id)}"><label>Result type<select name="metricName"><option value="reach">Reach</option><option value="views">Views</option><option value="likes">Likes</option><option value="comments">Comments</option><option value="shares">Shares</option><option value="saves">Saves</option><option value="clicks">Clicks</option></select></label><label>Result value<input name="metricValue" type="number" min="0" step="1" required></label><button type="submit">Record manual result</button></form></details>` : ''}
      </article>`;
    }).join('') : '<div class="campaign-empty"><h3>No deliverables yet.</h3><p>The agency can assign a creator and add the first deliverable after acceptance.</p></div>';
    root.innerHTML = `
      <header class="cd-campaign-title"><div><h1>${escape(campaign.name)}</h1><p>${escape(campaign.brief || 'The agency has not added a brief yet.')}</p></div><span class="cd-campaign-status">${escape(campaign.status || 'Campaign')}</span></header>
      <p class="campaign-feedback${error ? ' error' : ''}" role="status" aria-atomic="true">${escape(feedback)}</p>
      <section class="cd-focus" aria-label="Current handoff"><div><span>Current handoff · ${escape(focus.owner)}</span><h2>${escape(focus.title)}</h2><p>${escape(focus.detail)}</p></div><a href="${focusHref}">${focusCta}</a></section>
      <div class="cd-campaign-grid"><section id="campaign-deliverables" class="cd-deliverables"><div class="cd-section-heading"><h2>Deliverables</h2><span>${deliverables.length} total</span></div>${deliverableMarkup}</section>
      <aside class="cd-campaign-aside">
        ${isAgency ? `<details class="cd-setup" ${!accepted.length || !deliverables.length ? 'open' : ''}><summary>Campaign setup</summary><div class="cd-setup-content"><section><h3>Assign a creator</h3><p>The creator needs a CCF account. They accept in their workspace; no email is sent.</p><form class="campaign-form" id="assign-creator"><label>Creator email<input name="email" type="email" required autocomplete="email"></label><button type="submit">Assign creator</button></form></section>
        <section><h3>Brand reviewer</h3>${campaign.brand_organization_id ? '<p>A brand workspace is linked and can review submitted drafts.</p>' : brandRequests.length ? `<p>Awaiting brand acceptance for workspace ${escape(brandRequests[0].brand_organization_id)}. No email was sent.</p>` : `<p>Ask the brand for its workspace ID. Its manager accepts in-app; no email is sent.</p><form class="campaign-form" id="request-brand"><label>Brand workspace ID<input name="brandOrganizationId" required placeholder="org_…"></label><button type="submit">Request brand access</button></form>`}</section>
        <section><h3>Add a deliverable</h3>${accepted.length ? `<form class="campaign-form" id="add-deliverable"><label>Title<input name="title" required minlength="2" maxlength="160"></label><label>Platform<select name="platform"><option>Instagram</option><option>TikTok</option><option>YouTube</option><option>Other</option></select></label><label>Creator<select name="creatorUserId">${accepted.map(a => `<option value="${escape(a.creator_user_id)}">${escape(a.creator_user_id)}</option>`).join('')}</select></label><label>Due date<input name="dueAt" type="date"></label><button class="primary" type="submit">Add deliverable</button></form>` : '<p>Wait for an assigned creator to accept first.</p>'}</section></div></details>` : ''}
        <details class="cd-history"><summary>Decision history <span>${events.length}</span></summary>${events.length ? `<ol class="campaign-events">${events.slice().reverse().map(item => `<li><strong>${escape(label(item.event_type === 'request_revision' ? 'revision' : item.event_type === 'submit' ? 'submitted' : item.event_type === 'approve' ? 'approved' : item.event_type === 'publish' ? 'published' : item.event_type))}</strong>${item.note ? `<p>${escape(item.note)}</p>` : ''}${item.content_url ? `<p>${safeLink(item.content_url)}</p>` : ''}<small>${escape(new Date(item.created_at).toLocaleString('en-ZA'))}</small></li>`).join('')}</ol>` : '<p>No decisions have been recorded yet.</p>'}</details>
      </aside></div>`;
  }

  async function reload(message = '') {
    try { model = await api(); feedback = message; error = false; render(); }
    catch (cause) { error = true; feedback = cause.message; root.innerHTML = `<section class="campaign-card"><h1>Campaign unavailable</h1><p role="alert">${escape(feedback)}</p><a href="${back.href}">Back to workspace</a></section>`; }
  }

  async function submit(button, action) {
    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'Saving…';
    try { await action(); await reload('Saved. The next person can now see this update.'); }
    catch (cause) {
      feedback = cause.message;
      error = true;
      const status = root.querySelector('.campaign-feedback');
      if (status) { status.textContent = feedback; status.classList.add('error'); status.setAttribute('role', 'alert'); }
    }
    finally { button.disabled = false; button.textContent = original; }
  }

  root.addEventListener('submit', event => {
    const form = event.target;
    if (!form.matches('form')) return;
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    if (form.id === 'assign-creator') return submit(button, () => api('/creators', { email: form.elements.email.value.trim() }));
    if (form.id === 'request-brand') return submit(button, () => api('/brand-request', { brandOrganizationId: form.elements.brandOrganizationId.value.trim() }));
    if (form.id === 'add-deliverable') return submit(button, () => api('/deliverables', { title: form.elements.title.value.trim(), platform: form.elements.platform.value, creatorUserId: form.elements.creatorUserId.value, dueAt: form.elements.dueAt.value || null }));
    if (form.dataset.metric) return submit(button, () => api(`/deliverables/${encodeURIComponent(form.dataset.metric)}/metrics`, { metricName: form.elements.metricName.value, metricValue: Number(form.elements.metricValue.value) }));
    if (form.dataset.transition) return submit(button, () => api(`/deliverables/${encodeURIComponent(form.dataset.id)}/transition`, { action: form.dataset.transition, note: form.elements.note?.value.trim(), contentUrl: form.elements.contentUrl?.value.trim() }));
  });
  root.addEventListener('change', async event => {
    const input = event.target;
    if (!input.matches('[data-file-upload]')) return;
    const file = input.files?.[0];
    if (!file) return;
    const deliverableId = input.dataset.fileUpload;
    const statusEl = document.getElementById('upload-status-' + deliverableId);
    const urlInput = document.getElementById('content-url-' + deliverableId);
    if (statusEl) {
      statusEl.style.color = '#ff5b00';
      statusEl.textContent = `Uploading ${file.name} (${Math.round(file.size / 1024)} KB) to storage…`;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('assetType', 'draft');
    try {
      const response = await fetch(`${base}/deliverables/${encodeURIComponent(deliverableId)}/upload`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed.');
      if (urlInput) urlInput.value = data.asset.url;
      if (statusEl) {
        statusEl.style.color = '#15803d';
        statusEl.innerHTML = `✓ Uploaded to ${data.asset.storage === 'supabase' ? 'Supabase Storage' : 'Storage'}. Ready to submit.`;
      }
    } catch (err) {
      if (statusEl) {
        statusEl.style.color = '#dc2626';
        statusEl.textContent = 'Upload error: ' + err.message;
      }
    }
  });

  root.addEventListener('click', event => {
    const button = event.target.closest('[data-decision]');
    if (button) submit(button, () => api(`/deliverables/${encodeURIComponent(button.dataset.id)}/transition`, { action: button.dataset.decision }));
  });
  reload();
})();
