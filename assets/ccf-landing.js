/* CCF landing: one clear story, one sample interaction, no invented traction. */
window.CCFLanding = function () {
  const arrow='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const pilot='mailto:reamogetswemolefe@creatorcashflow.co.za?subject=CCF%20one-campaign%20pilot&body=Hi%20CCF%2C%20I%27d%20like%20to%20walk%20through%20one%20upcoming%20campaign.%20Our%20agency%20is%3A%20';
  // Licensed stock for marketing only. Provenance: assets/photography/README.md.
  return `<div class="ccf-site ccf2-site">
    <section class="ccf2-hero" aria-labelledby="ccf-heading">
      <div class="ccf2-hero-copy">
        <p class="ccf-eyebrow">Creator campaigns, without the chase</p>
        <h1 id="ccf-heading">The campaign shouldn't live in your inbox.</h1>
        <p class="ccf2-lead">Briefs. Drafts. Approvals. Post links. One clear path from idea to done.</p>
        <div class="ccf2-actions"><a class="ccf-button ccf-primary" href="#how-it-works">See the handoff ${arrow}</a><a class="ccf-text-link" href="${pilot}">Discuss a pilot ${arrow}</a></div>
        <p class="ccf2-hero-note">Built for creator agencies · <a href="#signup">Free for creators</a></p>
      </div>
      <figure class="ccf2-visual">
        <img src="/assets/photography/creator-recording-1280.jpg" srcset="/assets/photography/creator-recording-640.jpg 640w, /assets/photography/creator-recording-1280.jpg 1280w" sizes="(max-width: 800px) calc(100vw - 64px), 45vw" alt="Creator preparing to record content in a bright studio" width="1280" height="853" fetchpriority="high" decoding="async">
        <figcaption class="ccf2-visual-card"><span class="ccf2-visual-label">Sample campaign · Spring in motion</span><strong>Draft ready for review</strong><span>Creator → agency <span aria-hidden="true">↗</span></span></figcaption>
        <a class="ccf2-credit" href="https://www.pexels.com/photo/happy-black-woman-preparing-for-online-recording-with-smartphone-6954098/" target="_blank" rel="noopener noreferrer">Stock photo · George Milton / Pexels</a>
      </figure>
    </section>

    <section id="how-it-works" class="ccf2-story" aria-labelledby="ccf2-story-heading">
      <div class="ccf2-story-intro"><p class="ccf-eyebrow">See it from every side</p><h2 id="ccf2-story-heading">One campaign.<br>Three clear next moves.</h2><p>Choose a perspective to see what happens after the creator submits a draft.</p>
        <div class="ccf2-perspectives" aria-label="Campaign perspective"><button type="button" data-ccf-perspective="agency" aria-pressed="true">Agency</button><button type="button" data-ccf-perspective="brand" aria-pressed="false">Brand</button><button type="button" data-ccf-perspective="creator" aria-pressed="false">Creator</button></div>
      </div>
      <div class="ccf2-stage" aria-live="polite"><div class="ccf2-stage-top"><span>CCF / Campaign workspace</span><span>Interactive sample</span></div><div class="ccf2-stage-body"><div class="ccf2-stage-progress" aria-label="Campaign steps"><span>Brief</span><span>Draft</span><span class="is-active">Review</span><span>Publish</span></div><p class="ccf2-stage-role" id="ccf2-role">Agency perspective</p><h3 id="ccf2-moment">The creator draft is ready.</h3><p id="ccf2-detail">Review it once, then send a clear version to the brand.</p><div class="ccf2-stage-next"><span>Next move</span><strong id="ccf2-next">Agency reviews the draft</strong></div></div><a class="ccf2-stage-link" href="#request-demo">Request the full demo by email ${arrow}</a></div>
    </section>

    <section class="ccf2-invite" aria-labelledby="ccf2-invite-heading"><div><p class="ccf-eyebrow">Start small. Prove the value.</p><h2 id="ccf2-invite-heading">Bring one real campaign.</h2><p>We’ll set up your brief and approval steps with you. You decide if it saves your team the chase.</p></div><div class="ccf2-invite-action"><a class="ccf-button ccf-primary" href="${pilot}">Discuss a one-campaign pilot ${arrow}</a><p>Agency collaboration is early access. Automated payments and client-ready reports are not available yet.</p></div></section>
  </div>`;
};

const ccfPerspectives={
  agency:{role:'Agency perspective',moment:'The creator draft is ready.',detail:'Review it once, then send a clear version to the brand.',next:'Agency reviews the draft'},
  brand:{role:'Brand perspective',moment:'A reviewed version is waiting.',detail:'See the deliverable and leave one decision where the work lives.',next:'Brand approves or requests changes'},
  creator:{role:'Creator perspective',moment:'The next step is visible.',detail:'See the brief, feedback and publish link in the same campaign.',next:'Creator responds to feedback'}
};
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-ccf-perspective]');
  if(!button)return;
  const view=ccfPerspectives[button.dataset.ccfPerspective];
  if(!view)return;
  document.querySelectorAll('[data-ccf-perspective]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
  for(const [id,value] of [['ccf2-role',view.role],['ccf2-moment',view.moment],['ccf2-detail',view.detail],['ccf2-next',view.next]]){
    const target=document.getElementById(id);
    if(target)target.textContent=value;
  }
});

document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  const button=document.querySelector('[data-action="menu"][aria-expanded="true"]');
  if(!button)return;
  button.setAttribute('aria-expanded','false');
  document.getElementById(button.getAttribute('aria-controls'))?.classList.remove('is-open');
});
