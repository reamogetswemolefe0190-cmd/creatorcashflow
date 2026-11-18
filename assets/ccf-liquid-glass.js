/* Site-wide liquid glass — applies deepika-builds/liquid-glass (real SVG-displacement
 * refraction, Chromium) to the site's glass surfaces on every page; frosted-blur
 * fallback in Safari/Firefox. Subtle tuning; skips oversized elements (>900px side)
 * per the skill's GPU-cost gotcha. Re-applies to dynamically routed content and
 * modals via MutationObserver. */
(function () {
  'use strict';
  var SELECTORS = [
    '.public-header', '.glass-pill-nav', '.mobile-bottom-nav',
    '.modal-content', '.codex-modal', '.glass-card', '.glass-card-nested',
    '.hq-panel', '.onboard-choice-card', '.card-shadow',
    '.ccf-n-progress', '.ccf-n-stage-window',
    '.cc-btn.cc-primary', '.ccf-n-button-primary', '.role-sheet > div',
    '.campaign-header', '.invite-header', '.sticky.top-0',
    '.campaign-card', '.campaign-form', '.campaign-deliverable', '.campaign-summary', '.campaign-events',
    '.role-panel', '.role-metric', '.cd-queue-row', '.cd-request', '.cd-deliverable'
  ].join(',');
  var OPTS = { scale: -60, chroma: 4, blur: 6, saturate: 1.3 }; // subtle: -60/4 per skill
  var applied = new WeakSet();

  function enhance(el) {
    if (!window.liquidGlass || applied.has(el) || !el.isConnected) return;
    var w = el.offsetWidth, h = el.offsetHeight;
    // skill gotcha: skip hidden or oversized elements (map is O(w*h), filter is per-frame GPU)
    if (!w || !h || w > 1600 || h > 1000 || w * h > 900000) return;
    applied.add(el);
    var g = window.liquidGlass(el, OPTS);
    // Inline !important beats the design system's `backdrop-filter:none !important`
    // overrides (ccf-system.css) so the effect actually shows on those pages.
    el.style.setProperty('backdrop-filter', el.style.backdropFilter, 'important');
    el.style.setProperty('-webkit-backdrop-filter', el.style.backdropFilter, 'important');
    el.classList.add('lg-glass');
    el.dataset.lgSupported = String(g.supported);
  }

  function sweep(root) {
    var el = root && root.nodeType === 9 ? root.documentElement : root; // allow sweep(document)
    if (!el || el.nodeType !== 1) return;
    if (el.matches(SELECTORS)) enhance(el);
    el.querySelectorAll(SELECTORS).forEach(enhance);
  }

  function init() {
    sweep(document);
    var mo = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        if (m.type === 'attributes') { sweep(m.target); return; }
        m.addedNodes.forEach(function (n) { sweep(n); });
      });
    });
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
