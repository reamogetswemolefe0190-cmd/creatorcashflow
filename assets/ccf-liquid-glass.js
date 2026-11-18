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
  var OPTS = { scale: -96, chroma: 6, blur: 10, saturate: 1.45 }; // near the skill's -112 default; needs translucent element backgrounds to be visible
  var applied = new WeakSet();

  // Surfaces whose own background must become translucent for the refraction to show.
  // Buttons are excluded — their solid brand color should stay solid.
  var SURFACE = /header|nav|modal|panel|card|pill|progress|window|sheet|queue|request|deliverable|summary|events|metric|row|dock/i;

  function alphaOf(color) {
    var m = String(color).match(/[\d.]+/g);
    return m && m.length >= 4 ? parseFloat(m[m.length - 1]) : 1;
  }

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
    // Some surfaces carry an opaque background that hides the refraction entirely.
    // Lower it to 58% — inline !important wins every stylesheet, including ones with
    // their own !important backgrounds. Skip if already translucent (alpha < 0.9) or
    // if the background is a gradient (backgroundColor is transparent then).
    if (SURFACE.test(el.tagName + ' ' + el.className)) {
      var cs = getComputedStyle(el);
      if (cs.backgroundImage === 'none' && cs.backgroundColor && !/transparent/.test(cs.backgroundColor) && alphaOf(cs.backgroundColor) >= 0.9) {
        el.style.setProperty('background', 'color-mix(in srgb, ' + cs.backgroundColor + ' 58%, transparent)', 'important');
      }
    }
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
