/* CCF landing component: semantic, route-native links; no simulated live metrics. */
window.CCFLanding = function () {
  const arrow='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  // Licensed stock for marketing only. Provenance: assets/photography/README.md.
  const image=document.createElement('img');
  image.src='/assets/photography/creator-recording-1280.jpg';
  image.srcset='/assets/photography/creator-recording-640.jpg 640w, /assets/photography/creator-recording-1280.jpg 1280w';
  image.sizes='(max-width: 800px) calc(100vw - 64px), (max-width: 1100px) 45vw, 568px';
  image.alt='Creator positioning a smartphone beside a ring light in a bright home studio';
  image.width=1280;image.height=853;image.loading='lazy';image.decoding='async';
  return `<div class="ccf-site">
    <section class="ccf-hero" aria-labelledby="ccf-heading">
      <div class="ccf-hero-copy">
        <p class="ccf-eyebrow">For creators, agencies &amp; brands</p>
        <h1 id="ccf-heading">The business behind<br><span>great content.</span></h1>
        <p class="ccf-lead">One workspace to take a campaign from brief to payment. Track deliverables, manage reviews and keep income records in one place.</p>
        <div class="ccf-actions"><a class="ccf-button ccf-primary" href="#signup">Create free account ${arrow}</a><a class="ccf-text-link" href="#journey">See how it works ${arrow}</a></div>
        <p class="ccf-availability">Free for creators &nbsp;·&nbsp; Agency &amp; brand pilot</p>
      </div>
      <div class="ccf-hero-visual">${image.outerHTML.replace('loading="lazy"','loading="eager" fetchpriority="high"')}<div class="ccf-hero-caption"><img src="/brand/connection-mark.svg" alt="" width="56" height="56"><p>More room to create.<br><span>One place for the work behind it.</span><a class="ccf-photo-credit" href="https://www.pexels.com/photo/happy-black-woman-preparing-for-online-recording-with-smartphone-6954098/" target="_blank" rel="noopener noreferrer">Stock photo · George Milton / Pexels</a></p></div></div>
    </section>
    <div class="ccf-workflow"><span>A connected campaign workflow</span><ol><li>Brief</li><li>Create</li><li>Review</li><li>Record</li></ol></div>
    <section class="ccf-preview" aria-labelledby="ccf-preview-heading">
      <div class="ccf-preview-intro"><p class="ccf-eyebrow">From brief to review</p><h2 id="ccf-preview-heading">See the work.<br>Know the next step.</h2><p>A shared campaign keeps the brief, creator submissions and review decisions in view.</p><a class="ccf-text-link" href="#journey">Explore sample campaign ${arrow}</a></div>
      <div class="ccf-workspace" aria-label="Illustrative campaign preview">
        <div class="ccf-workspace-bar"><span>CCF / Campaign workspace</span><span class="ccf-sample-label">Sample data</span></div>
        <div class="ccf-workspace-content"><p class="ccf-eyebrow">Campaign overview</p><h3>Vela Active</h3><p class="ccf-workspace-caption">Content, reviews and records in one place.</p>
          <dl class="ccf-preview-stats"><div><dt>Campaign budget</dt><dd>R60,000</dd></div><div><dt>Approved deliverables</dt><dd>8 <span>/ 12</span></dd></div></dl>
          <ul class="ccf-preview-tasks"><li><div><strong>Campaign brief</strong><span>Scope and deliverables</span></div><span class="ccf-status">Published</span></li><li><div><strong>Creator video</strong><span>Agency quality check</span></div><span class="ccf-status ccf-status-review">In review</span></li></ul>
          <p class="ccf-next-step"><strong>Next step</strong> Review the creator’s submission.</p>
        </div>
      </div>
    </section>
    <section class="ccf-roles" aria-labelledby="ccf-roles-heading">
      <div class="ccf-section-heading"><div><p class="ccf-eyebrow">One campaign. Three perspectives.</p><h2 id="ccf-roles-heading">Built around the people<br>behind every campaign.</h2></div><a class="ccf-text-link" href="#journey">Explore the workflow ${arrow}</a></div>
      <div class="ccf-role-grid">
        <article><div class="ccf-card-body"><span class="ccf-role-index">For creators</span><h3>More room to create.</h3><p>Track income, organise deliverables and see payment records in one private workspace.</p><div class="ccf-role-bottom"><span>Free creator account</span><a href="#creator">Explore creator view ${arrow}</a></div></div></article>
        <article><div class="ccf-card-body"><span class="ccf-role-index">For agencies</span><h3>Keep the work moving.</h3><p>Follow campaign progress, coordinate creator work and keep the next review in view.</p><div class="ccf-role-bottom"><span>Early-access pilot</span><a href="#agency">Explore agency view ${arrow}</a></div></div></article>
        <article><div class="ccf-card-body"><span class="ccf-role-index">For brands</span><h3>Clarity at every stage.</h3><p>Stay close to the brief, review deliverables and follow the campaign’s milestones.</p><div class="ccf-role-bottom"><span>Early-access pilot</span><a href="#brand">Explore brand view ${arrow}</a></div></div></article>
      </div>
    </section>
    <section class="ccf-feature" aria-labelledby="ccf-feature-heading"><div class="ccf-feature-photo">${image?image.outerHTML:''}<span>Made for the business behind the content.</span></div><div class="ccf-feature-copy"><p class="ccf-eyebrow">Less admin. More perspective.</p><h2 id="ccf-feature-heading">Good work deserves<br>a clear picture.</h2><p>Campaign activity and financial records belong in the same conversation. CCF brings them closer, without another spreadsheet to chase.</p><ul><li><span>01</span> Income and expense records</li><li><span>02</span> Shared campaign milestones</li><li><span>03</span> Authorised Instagram post insights</li></ul><p class="ccf-feature-note">Instagram access depends on Meta permissions and account eligibility.</p><a class="ccf-text-link" href="#availability">Explore what’s available ${arrow}</a></div></section>
    <section class="ccf-close"><p class="ccf-eyebrow">A clearer way to work</p><div><h2>Less chasing.<br>More creating.</h2><a class="ccf-button ccf-primary" href="#signup">Sign up for free ${arrow}</a></div><p>Agencies and brands can <a href="mailto:reamogetswemolefe@creatorcashflow.co.za?subject=CCF%20pilot">contact the team about the pilot</a>.</p></section>
  </div>`;
};

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
      const btn = document.querySelector('[data-action="menu"][aria-expanded="true"]');
      if (btn) {
          btn.setAttribute('aria-expanded', 'false');
          const nav = document.getElementById(btn.getAttribute('aria-controls'));
          if(nav) nav.classList.remove('is-open');
      }
  }
});
