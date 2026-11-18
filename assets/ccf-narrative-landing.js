/* Agency-first campaign story. All campaign content in the preview is illustrative. */
(function () {
  const arrow = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
  const handoffs = [
    { role: 'Agency', action: 'Review the creator draft', detail: 'Brief details, draft assets, and reviewer notes remain in one place.', state: 'Ready for review' },
    { role: 'Creator', action: 'Send the revised cut', detail: 'Feedback is attached to the work, not lost in a thread.', state: 'Revision requested' },
    { role: 'Brand', action: 'Approve what will go live', detail: 'The brand sees the version the agency has shared.', state: 'Awaiting decision' }
  ];
  const chapters = [
    { id: 'brief', title: 'Begin with a brief that holds together.', copy: 'Set the scope, creator and due date in one campaign record. The agency can see what is moving and what needs attention.', image: 'agency', alt: 'Illustrative agency campaign workspace with brief and review queue.', label: 'Agency desk' },
    { id: 'review', title: 'Make each review a clear handoff.', copy: 'Creators submit the work. Agencies decide what is ready. Brands review only what has been shared with them.', image: 'journey', alt: 'Illustrative shared campaign showing a deliverable review.', label: 'Shared campaign' },
    { id: 'publish', title: 'Keep the result beside the work.', copy: 'Save published post links and label manually entered results. Nobody has to rebuild the story from a spreadsheet later.', image: 'publish', alt: 'Illustrative published link with manually entered results.', label: 'Published record' }
  ];
  const preview = chapter => {
    const step = chapter.id[0].toUpperCase() + chapter.id.slice(1);
    const letters = Array.from(step, (letter, index) => `<span style="--letter-start:${index * 6}%;--letter-end:${64 + index * 6}%;--letter-delay:${index * 45}ms">${letter}</span>`).join('');
    return `<figure class="ccf-n-chapter-visual"><div class="ccf-n-visual-top"><span class="ccf-n-visual-identity"><span class="ccf-n-flow-word" aria-hidden="true">${letters}</span><span class="ccf-n-preview-context">${chapter.label}</span></span><span>Illustrative preview</span></div><picture><source media="(max-width: 700px)" srcset="/assets/demo/${chapter.image}-mobile.png"><img src="/assets/demo/${chapter.image}-desktop.png" width="1440" height="900" loading="lazy" decoding="async" alt="${chapter.alt}"></picture></figure>`;
  };
  window.CCFLanding = function () {
    return `<div class="ccf-next ccf-site">
      <section class="ccf-n-opening" aria-labelledby="ccf-n-heading">
        <div class="ccf-n-hero"><h1 id="ccf-n-heading">Every campaign.<br><span>Everyone in sync.</span></h1><p>Creator campaigns move through people, not inboxes. Give your agency, creators and brand one clear place to move the work forward.</p>
          <div class="ccf-n-actions"><a class="ccf-n-button ccf-n-button-primary" href="#request-demo">Request the demo ${arrow}</a><a class="ccf-n-button ccf-n-button-outline" href="#journey">Explore a sample campaign ${arrow}</a></div>
          <p class="ccf-n-availability">Built for agency-led campaigns. Creator accounts are free; agency and brand collaboration is in early access.</p></div>
        <div class="ccf-n-showcase" aria-label="Illustrative campaign handoff"><div class="ccf-n-showcase-head"><span>One campaign. A visible next move.</span><span>Illustrative campaign</span></div>
          <div class="ccf-n-stage"><div class="ccf-n-stage-left"><span class="ccf-n-stage-label">Spring in motion / campaign 01</span><h2>Work moves<br>when the next<br><i>move is clear.</i></h2><p>Follow the handoff from agency to creator to brand.</p></div>
            <div class="ccf-n-stage-right"><div class="ccf-n-stage-window"><div class="ccf-n-window-top"><span class="ccf-n-window-mark" aria-hidden="true"></span><span>Spring in motion</span><span>Campaign workspace</span></div><div class="ccf-n-window-body"><div class="ccf-n-window-progress" aria-label="Campaign stages"><span class="is-done">Brief</span><span class="is-current">Draft</span><span>Review</span><span>Published</span></div><div class="ccf-n-window-main"><span class="ccf-n-window-tag" id="ccf-handoff-state">Ready for review</span><span class="ccf-n-window-overline">Next move · <b id="ccf-handoff-role">Agency</b></span><strong id="ccf-handoff-action">Review the creator draft</strong><p id="ccf-handoff-detail">Brief details, draft assets, and reviewer notes remain in one place.</p></div><div class="ccf-n-window-footer"><span>Brief attached</span><span>Draft submitted</span><span>Decision pending</span></div></div></div><div class="ccf-n-role-switch" role="group" aria-label="See the next move by role">${handoffs.map((item, i) => `<button type="button" data-handoff="${i}" aria-pressed="${i === 0}">${item.role}</button>`).join('')}</div></div></div>
        </div>
      </section>
      <section class="ccf-n-intro" id="how-it-works" aria-labelledby="ccf-n-intro-heading"><h2 id="ccf-n-intro-heading">Clear campaign handoffs at every stage.</h2><p>Agencies assign deliverables directly from the brief, creators upload cuts with context, and brands review approved files without digging through email chains.</p></section>
      <nav class="ccf-n-progress" aria-label="Explore the campaign flow"><a href="#brief" data-ccf-progress="brief" aria-current="step">Brief</a><a href="#review" data-ccf-progress="review">Review</a><a href="#publish" data-ccf-progress="publish">Publish</a></nav>
      <div class="ccf-n-story">${chapters.map((chapter, i) => `<section class="ccf-n-chapter" id="${chapter.id}" data-ccf-step="${chapter.id}" aria-labelledby="ccf-n-${chapter.id}-heading"><div class="ccf-n-chapter-copy"><span class="ccf-n-chapter-step">${i + 1} of 3 · ${chapter.label}</span><h2 id="ccf-n-${chapter.id}-heading">${chapter.title}</h2><p>${chapter.copy}</p><a href="#journey" class="ccf-n-inline-link">Explore the live sample ${arrow}</a></div>${preview(chapter)}</section>`).join('')}</div>
      <section class="ccf-n-proof" aria-labelledby="ccf-n-proof-heading"><div class="ccf-n-proof-lead"><h2 id="ccf-n-proof-heading">Three perspectives.<br>One shared record.</h2><p>Each person sees the context and decisions relevant to their role. The agency stays in control of the campaign, while creator finances remain private.</p></div><div class="ccf-n-proof-links"><a href="#agency"><span>01 / Run the campaign</span><strong>Agency workspace</strong>${arrow}</a><a href="#creator"><span>02 / Deliver the work</span><strong>Creator workspace</strong>${arrow}</a><a href="#brand"><span>03 / Review with context</span><strong>Brand workspace</strong>${arrow}</a></div></section>
      <section class="ccf-n-request" id="request-demo" aria-labelledby="ccf-n-request-title"><div class="ccf-n-request-copy"><h2 id="ccf-n-request-title">See how one campaign comes together.</h2><p>Leave your name and email. We’ll send an interactive sample so you can explore the handoffs yourself.</p><p class="ccf-n-request-note">This is early access. The sample uses illustrative data and does not send payments, notify participants or verify platform metrics.</p></div><form id="ccf-demo-request" class="ccf-n-form" novalidate><div class="ccf-n-field"><label for="ccf-demo-name">Your name</label><input id="ccf-demo-name" name="name" type="text" autocomplete="name" minlength="2" maxlength="80" required placeholder="Name and surname"><span class="ccf-n-field-error" id="ccf-demo-name-error"></span></div><div class="ccf-n-field"><label for="ccf-demo-email">Email address</label><input id="ccf-demo-email" name="email" type="email" autocomplete="email" maxlength="254" required placeholder="you@agency.co.za"><span class="ccf-n-field-error" id="ccf-demo-email-error"></span></div><div class="ccf-n-honeypot" aria-hidden="true"><label for="ccf-demo-website">Website</label><input id="ccf-demo-website" name="website" tabindex="-1" autocomplete="off"></div><p class="ccf-n-form-status" id="ccf-demo-status" role="status" aria-live="polite" tabindex="-1"></p><button type="submit" class="ccf-n-button ccf-n-button-primary">Email me the demo ${arrow}</button><p class="ccf-n-form-privacy">We use these details to send the demo and follow up about CCF. Read our <a href="#privacy">privacy notice</a>. Prefer a conversation? <a href="mailto:reamogetswemolefe@creatorcashflow.co.za?subject=CCF%20demo">Email us</a>.</p></form></section>
    </div>`;
  };
  function initLanding(root) {
    if (!root || root.dataset.ccfReady) return;
    root.dataset.ccfReady = 'true';
    const primary = document.querySelector('.public-header .public-nav .primary-link');
    if (primary) { primary.href = '#request-demo'; primary.textContent = 'Request the demo'; }
    root.querySelectorAll('[data-handoff]').forEach(button => button.addEventListener('click', () => {
      const item = handoffs[Number(button.dataset.handoff)];
      root.querySelectorAll('[data-handoff]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
      root.querySelector('#ccf-handoff-role').textContent = item.role;
      root.querySelector('#ccf-handoff-action').textContent = item.action;
      root.querySelector('#ccf-handoff-detail').textContent = item.detail;
      root.querySelector('#ccf-handoff-state').textContent = item.state;
    }));
    if ('IntersectionObserver' in window) {
      // Nav highlight is CSS-driven via scroll-target-group/:target-current (see ccf-narrative.css);
      // this observer remains as the fallback for browsers without scroll-target-group and to mirror
      // the visual state to aria-current, which :target-current does not expose to screen readers.
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        root.querySelectorAll('[data-ccf-step]').forEach(chapter => chapter.classList.toggle('is-active', chapter === entry.target));
        root.querySelectorAll('[data-ccf-progress]').forEach(link => {
          if (link.dataset.ccfProgress === entry.target.dataset.ccfStep) link.setAttribute('aria-current', 'step');
          else link.removeAttribute('aria-current');
        });
      }), { rootMargin: '-22% 0px -48% 0px', threshold: 0 });
      root.querySelectorAll('[data-ccf-step]').forEach(chapter => observer.observe(chapter));
      const previewObserver = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-preview-visible');
        previewObserver.unobserve(entry.target);
      }), { rootMargin: '0px 0px -16% 0px', threshold: 0 });
      root.querySelectorAll('.ccf-n-chapter-visual').forEach(visual => previewObserver.observe(visual));
    }
    if (location.hash === '#request-demo') requestAnimationFrame(() => root.querySelector('#request-demo')?.scrollIntoView());
  }
  document.addEventListener('submit', async event => {
    if (event.target.id !== 'ccf-demo-request') return;
    event.preventDefault();
    const form = event.target, button = form.querySelector('button[type="submit"]'), status = form.querySelector('#ccf-demo-status');
    const nameInput = form.elements.namedItem('name'), emailInput = form.elements.namedItem('email');
    const name = nameInput.value.trim(), email = emailInput.value.trim();
    const errors = [[nameInput, form.querySelector('#ccf-demo-name-error'), name.length < 2 ? 'Please enter your name.' : ''], [emailInput, form.querySelector('#ccf-demo-email-error'), !emailInput.validity.valid ? 'Please enter a valid email address.' : '']];
    errors.forEach(([input, output, message]) => { output.textContent = message; input.setAttribute('aria-invalid', String(Boolean(message))); if (message) input.setAttribute('aria-describedby', output.id); else input.removeAttribute('aria-describedby'); });
    const firstInvalid = errors.find(([, , message]) => message);
    if (firstInvalid) { firstInvalid[0].focus(); return; }
    button.disabled = true; button.textContent = 'Sending your demo…'; status.textContent = ''; status.removeAttribute('data-state');
    try {
      const response = await fetch('/api/demo-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, website: form.elements.namedItem('website').value }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The demo could not be sent. Please try again.');
      status.textContent = data.message || 'Your interactive demo is on its way. Check your inbox.'; status.dataset.state = 'success'; form.reset();
    } catch (error) { status.textContent = `${error.message} You can also email reamogetswemolefe@creatorcashflow.co.za.`; status.dataset.state = 'error'; }
    finally { button.disabled = false; button.innerHTML = `Email me the demo ${arrow}`; status.focus(); }
  });
  const watch = new MutationObserver(() => initLanding(document.querySelector('.ccf-next')));
  document.addEventListener('DOMContentLoaded', () => { const screen = document.getElementById('cc-screen'); if (screen) watch.observe(screen, { childList: true }); initLanding(document.querySelector('.ccf-next')); });
})();
