# Campaign desk demo captures

These PNGs are browser captures of CCF's own UI, not third-party product screenshots. They were produced on 2026-09-24 with `scripts/capture-campaign-desk.cjs` at 1440×900 and 390×844. The script launches the local Express app, supplies labelled illustrative campaign data and mock API responses, then captures the agency, brand and shared-campaign screens. `publish-*` advances the browser-local sample to its published state and scrolls to the manually entered results.

The names, campaign, link and performance figures in these images are sample data. They do not represent a live client, a real post, verified metrics, sent notifications or payments. The public page captions must retain the “illustrative data” label.

To regenerate, provide a local Playwright module with `CCF_PLAYWRIGHT_MODULE` (or install `playwright`) and run `node scripts/capture-campaign-desk.cjs` from the project root. Browser binaries must be available; the helper currently launches Edge.
