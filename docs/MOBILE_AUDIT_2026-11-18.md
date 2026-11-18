# Mobile Audit — Creator Cash Flow (`app/`), 2026-11-18

**Scope:** all served pages/routes at 320×568, 375×812, 414×896 (mobile emulation, touch).
Pages: `index.html` routes `#landing #signup #login #journey #privacy #terms #security #creator #agency #brand`, plus `admin.html`, `agency.html`, `brand.html`, `campaign.html`, `invite.html`, `logo_showcase.html` — 16 routes × 3 widths = 48 checks.

**Method:** headless Chromium (Playwright) against `http://127.0.0.1:5000`. Per page/width: horizontal overflow (document + element scan, excluding elements inside `overflow-x:auto` containers), tap-target sizes (<24px flagged, WCAG 2.5.8; 44px = Apple HIG), sticky-nav overlap on the landing chapters, presence of liquid-glass (`lg-glass`) and scroll effects (ScrollTrigger count, progress bar), viewport meta, console/page errors, and a 375px screenshot.

Raw data: `tmp/mobile-audit3.json` (post-fix), `tmp/mobile-audit.json` (pre-fix). Screenshots in `tmp/mobile-audit/`.

## Results: before → after

| Check | Before (48 combos) | After |
|---|---|---|
| Horizontal overflow | 1 (`admin.html` @320: scrollWidth 341>320, decorative `.ambient-orb`/`.ambient-mesh-center-glow`; tab strip overflow was a false positive — it scrolls internally) | **0** |
| Tap targets <24px | 33 combos flagged (header "Sign in", footer links, landing form privacy/mailto links, info-page "Back to the platform", campaign "Sign in", logo-showcase "Copy SVG" buttons — 16–22px tall) | **0** |
| Sticky nav overlapping chapters (landing) | 0 | 0 (`scroll-margin-top` respected at all widths) |
| Viewport meta | present on all pages | present |
| Console/page errors | 0 | 0 |
| Liquid glass present | landing 5, admin 7, agency/brand/campaign 2, invite 1, logo 1 (`.lg-glass` with `url(#lg-filter-N)`) | unchanged, working at all widths |
| Scroll effects (landing) | progress bar + 12 ScrollTriggers @desktop; leaked triggers on route change (stale count on non-landing routes) | bar present, 7 live triggers, stale triggers killed on route change |

## Fixes applied (this branch)

1. `admin.html`: `html,body{overflow-x:clip}` — decorative ambient orbs no longer cause horizontal scroll at 320px. (Tab strip already had `overflow-x:auto`.)
2. Mobile tap-target rule (`@media max-width:640px`, min-height 44px + inline-flex for text links, buttons ≥44px) appended to `style.css` and `assets/ccf-system.css` (covers index/agency/brand/invite/campaign), and an inline rule in `logo_showcase.html` for its copy buttons. Selectors: `.public-header a`, `.customer-footer a`, `.invite-header a`, `.campaign-header a`, `.campaign-root a`, `.ccf-n-request a`, `.customer-main a`, `button` — deliberately excludes pill-nav/CTA classes that are already ≥44px.
3. `assets/ccf-narrative-landing.js`: MutationObserver now kills ScrollTriggers whose trigger element was removed by client-side routing (fixes trigger leak across `#` routes).

## Consistency notes (verified OK)

- No horizontal overflow on any page at 320/375/414.
- Landing sticky progress nav never overlaps chapter content (scroll-margin works).
- Liquid glass and the scroll progress bar are present and functional on mobile; refraction is Chromium-only with frosted fallback elsewhere (per the liquid-glass skill).
- `prefers-reduced-motion: reduce` disables all scroll animation (verified earlier: 0 triggers).
- Focus outlines (`outline:3px solid` focus-visible) already present in `customer.css`.

## Not covered by automation (recommend a manual pass)

- Text contrast ratios (needs a contrast tool / visual pass), screen-reader flow, and real-device testing on iOS Safari (fallback path) — the automated pass ran in Chromium only.
- Authenticated workspace screens (`agency.html`/`brand.html` dashboards) render demo/login states without credentials; audit the logged-in dashboards with real accounts on a phone.

## Addendum — `#journey` demo page at 768–1024px (same day, after a screenshot review)

The first pass only audited logged-out shell markup, so it missed content states rendered into `#cc-screen`. A screenshot of `index.html#journey` at ~862px showed clipped content. A logged-in repro (test server + real API signup/campaign/deliverable flow) plus a width sweep of `#journey` (375–1440) found and fixed:

| Bug | Root cause | Fix |
|---|---|---|
| Stage rail steps spilled past the right edge at 768/862px | `assets/ccf-campaign-desk.css` set `#cc-screen .pilot-stage-rail{overflow:visible}` over a `repeat(6,minmax(145px,1fr))` grid (870px+ min) | ≤1050px → `repeat(3,minmax(0,1fr))`, ≤900px → `repeat(2,minmax(0,1fr))` (≤760px already switches to a horizontal scroll strip) |
| Header nav wrapped: "Request the demo" CTA broke to two lines, "Exit demo" link clipped at 862px | `.public-nav a` / `.primary-link` had no `white-space:nowrap`; narrative gap 28px too wide at ≤1024px | `white-space:nowrap` on `.public-nav a`, `.public-nav .primary-link`, `.demo-notice a` (customer.css); `@media(max-width:1024px){body.ccf-marketing .public-nav{gap:14px}.public-header{gap:16px}}` in ccf-campaign-desk.css (loads after narrative.css, so it wins the cascade) |

Re-verified after the fix: 0 overflowing elements at 375/414/768/862/1024/1280/1440 on `#journey`; full public-route audit (42 combos: `/`, `#landing`, `#journey`, agency, brand, invite, logo_showcase × 6 widths) → **0 flags, `scrollWidth == innerWidth` everywhere**. The only remaining probe hits were false positives: the off-screen `.ccf-n-honeypot` (intentionally at -10000px) and chapter-preview `<img>`s mid Ken Burns zoom, which are clipped by `overflow:hidden` on `.ccf-n-chapter-visual` and never grow the page (`overflow-x:clip` on `html,body`). Tests after the fix: full_site 11/11, pivot 37/37, admin_auth 31/31, admin_metrics 34/34, collaboration_flow 51/0; legacy-scan unchanged at 8 (7 deferred test-file findings + 1 kept scrollspy fallback).
