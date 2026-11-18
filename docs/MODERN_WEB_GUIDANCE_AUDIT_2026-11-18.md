# Modern Web Guidance Audit — Creator Cash Flow (`app/`)

- **Date:** 2026-11-18
- **Target:** `CCF/app` (the full-stack app served on `http://127.0.0.1:5000` via `node server.js`)
- **Tool:** `modern-web-guidance@1.0.1` (Google Chrome / Edge / Firefox / MDN stewarded skill)
  - Skill installed project-wide via `npx modern-web-guidance@latest install` → `.agents/skills/modern-web-guidance/` and `.vibe/skills/modern-web-guidance/`
- **Method:** `legacy-scan . --json` (deterministic legacy-pattern rules) + `retrieve` of the matched guides + targeted `search` for broader topics + manual verification of each finding against the source.
- **Raw scan output:** `app/tmp/legacy-scan-app.json` (30 findings; 27 doc/test files skipped by the scanner; 38 guides / 52 rules checked — `legacy-scan` covers only the ~20% of the catalog with deterministic legacy rules, so this is not exhaustive; use `search <topic>` for the rest).

## Summary

| Guide / rule | Findings | Where | Priority |
|---|---|---|---|
| `autofill-sign-in-form` | 1 | `admin.html:177` | P1 |
| `secure-external-subresources` (SRI/CORS/referrer) | 1 scanned + 6 more found manually | `videos/.../cta-close.html:130`; CDN `<script>`s in all main pages | P1 |
| `js/replace-children-innerhtml` | 6 | `app.js` (375, 835, 861, 896, 915, 1596) | P2 |
| `js/copying-array-methods` | 8 | `app.js`, `assets/ccf-creator.js`, `dashboards.js`, `controllers/adminController.js` (+2 test/harness files) | P2 |
| `js/structured-clone` | 5 | `admin.js` (336–339, 356) (+3 test files) | P2 |
| `scrollspy/js` | 1 | `assets/ccf-narrative-landing.js:51` | P2 |
| `customize-scrollbar-color-and-thickness` | 3 | `admin.html:78,85,89` | P3 |
| `js/error-cause` | 1 | `test_full_site.js:89` | P3 |

All findings were verified against the source; none were dropped as false positives. Test/harness files are flagged but are not product code.

## Verified findings & recommendations

### P1 — Security / credential UX

1. **CDN scripts without Subresource Integrity** (`secure-external-subresources`)
   - Scan finding: `videos/creator-cash-flow-pitch/compositions/components/cta-close.html:130` loads `https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js` with no `integrity`, `crossorigin`, or `referrerpolicy`.
   - Manual sweep of the served pages found the same pattern in the product itself: `cdn.tailwindcss.com`, `unpkg.com/lucide@latest`, `cdn.jsdelivr.net/npm/lucide@latest/...`, `cdn.jsdelivr.net/npm/chart.js` (unpinned), `cdn.getphyllo.com/connect/v2/phyllo-connect.js`, plus Google Fonts `<link>`s — all without SRI.
   - **Recommendation:** pin every third-party URL to an exact version, add `integrity="sha384-..."`, `crossorigin="anonymous"`, `referrerpolicy="no-referrer"` (generate the digest from a known-good local copy, per the guide). Strongly consider self-hosting Tailwind/lucide/Chart.js into `assets/vendor/` (the project already vendors assets there) so the landing page has zero third-party runtime dependencies; keep Phyllo on CDN+SRI since it must come from their origin.

2. **Sign-in password field lacks `autocomplete`** (`autofill-sign-in-form`)
   - `admin.html:177`: `<input type="password" id="admin-password" ...>` inside the master-password sign-in form has no `autocomplete` attribute, so password managers won't autofill.
   - **Recommendation:** add `autocomplete="current-password"` (and `name="password"`); per the guide, also allow password pasting and use `inputmode`/appropriate types on the email field.

### P2 — Modern platform APIs in product code

3. **`el.innerHTML = ''` → `el.replaceChildren()`** (`js/replace-children-innerhtml`)
   - `app.js:375, 835, 861, 896, 915, 1596` empty the DOM via `innerHTML = ''`, which invokes the HTML parser and breaks under Trusted Types CSP.
   - **Recommendation:** replace with `el.replaceChildren()` — same behavior, no parsing, CSP-safe.

4. **Copy-then-mutate arrays → copying array methods** (`js/copying-array-methods`)
   - `app.js:231, 1464`: `state.activities.slice().reverse()` → `state.activities.toReversed()`.
   - `assets/ccf-creator.js:22`, `dashboards.js:123, 136`, `controllers/adminController.js:452` (and test/harness files): `[...x].sort(fn)` / `x.slice().sort(fn)` → `x.toSorted(fn)`.
   - **Recommendation:** adopt `toSorted()`/`toReversed()`/`findLast()`/`findLastIndex()` (Baseline since 2023). Note the guide's caveat: keep the `[...iterable]` conversion when the receiver is a `Set`/`NodeList`/string, and don't rewrite `slice().reverse().findIndex()` without auditing index math.

5. **`JSON.parse(JSON.stringify(x))` → `structuredClone(x)`** (`js/structured-clone`)
   - `admin.js:336–339, 356` deep-copy demo fixtures via the JSON round-trip.
   - **Recommendation:** use `structuredClone(x)`. Caveat from the guide: don't switch where callers rely on JSON wire normalization (`.toJSON()`, dropping `undefined`/functions) — for plain fixture data `structuredClone` is a drop-in.

6. **IntersectionObserver scrollspy → CSS scroll-driven** (`scrollspy`)
   - `assets/ccf-narrative-landing.js:51`: manual `IntersectionObserver` toggles `is-active`/`aria-current` on nav links.
   - **Recommendation:** use `scroll-target-group: auto` on the nav container + `:target-current` on links (supported Chrome/Edge 140+ only) and **keep** the `IntersectionObserver` as the feature-detected fallback for Firefox/Safari, per the guide. The guide marks `aria-current` as **mandatory** alongside `:target-current` because the pseudo-class is not exposed to screen readers — the current code already sets it, so preserve that in the refactor. Related: the scroll-reveal `IntersectionObserver`s in `app.js` / `customer.js` / `assets/ccf-narrative-landing.js` can move to CSS `animation-timeline: view()` (see the `motion` guide) with a `prefers-reduced-motion` guard.

### P3 — Polish / hygiene

7. **Vendor-only scrollbar styling** (`customize-scrollbar-color-and-thickness`)
   - `admin.html:78–89` uses only `::-webkit-scrollbar*`.
   - **Recommendation:** add standard `scrollbar-color: <thumb> <track>;` and `scrollbar-width` on the scroller (thumb needs ≥3:1 contrast vs track, WCAG 1.4.11), and move the `::-webkit-*` rules into an `@supports not (scrollbar-color: auto)` fallback block so Firefox gets the standard properties.

8. **`new Error(msg)` without cause** (`js/error-cause`)
   - `test_full_site.js:89`.
   - **Recommendation:** `new Error(msg, { cause: err })` — test-only, low priority.

## Broader observations (from guide `search`, not the deterministic scan)

- The admin login and other overlays are hand-rolled modal `<div>`s (`admin.html` has 11 `*modal*` divs; no `<dialog>` anywhere in the served pages). The `dialog` / `light-dismiss-a-dialog` / `platform-controls-dismiss-dialog` guides recommend the native `<dialog>` + `popover` with `::backdrop`, which gives Esc-to-close, focus trapping, and light dismiss for free.
- Long dashboards/lists are good candidates for `content-visibility: auto` (`defer-rendering-heavy-content`) and `optimize-image-priority` for the LCP hero image (`performance` guide) — worth a Lighthouse pass on `http://127.0.0.1:5000` before/after.
- Form feedback timing: see `validate-input-after-interaction` — only show validation errors after the user's first interaction, not on load/while typing.

## How to re-verify after fixes

```sh
cd app
npx --yes modern-web-guidance@latest legacy-scan . --json
```

Dropped/fallback code can still match static scans — re-scan to confirm the intended findings are resolved, not to force zero.

## Notes

- The skill was installed into the CCF project at `.agents/skills/modern-web-guidance/` (universal) and `.vibe/skills/modern-web-guidance/` (Mistral Vibe). Socket flagged 1 alert on the package; Snyk rates it Low Risk; source is `github.com/GoogleChrome/modern-web-guidance-src`.
- `prototype-and-docs/prototype` (the Next.js app on :5173) was not scanned in this pass; run the same `legacy-scan` there if you want it covered.
