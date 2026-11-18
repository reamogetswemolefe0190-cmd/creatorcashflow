# Campaign reports

> Shelved on 23 September 2026. This is a retained prototype, not part of the active CCF pilot. The Reports navigation, dashboard mount, and report API routes are disabled. Do not present the sample as a client report or deploy the report migration while the feature is shelved. The implementation files remain for a later redesign.

The prototype supports a dated decision brief containing the campaign objective, headline takeaway, interpretation, recommended next action, optional target and client decision, and published post evidence. The report requires the agency to explain what the numbers mean rather than exporting a bare metric list. An optional target is never fabricated: when none is recorded, the PDF explicitly says it cannot judge quantitative success.

Published evidence includes labelled post links, dates, and optional manually entered reach, views, likes, comments, shares, and saves. Each entered result has an as-of date and is labelled **Manually supplied by agency**. Missing metrics say **Not supplied**; the PDF does not calculate an aggregate audience or claim Meta verification. Page one is an executive readout and next decision; page two begins the linked evidence appendix.

Agency members with owner, manager, or analyst access can download the agency PDF. A linked brand's active owner, manager, analyst, or brand viewer can download a separate brand PDF. Agency-only notes and the recorded fixed fee are excluded from the brand PDF. Brand users cannot create or edit reports. Both versions are generated from the saved snapshot, so later campaign edits do not silently change an issued report. A new report creates a new dated copy.

The report is an export of agency-entered campaign information, not proof of post performance. Review links and numbers with the client before relying on them. The brand sees a report only when its organisation is linked to the campaign. Creating that link and the wider approval workflow remain separate work; an unlinked campaign produces an agency-only report.

## If the feature is revisited

1. Apply `migrations/20260909_campaign_collaboration.sql` if it is not already installed.
2. Review and revise the report model with an actual agency and brand before re-enabling it. The current sample uses illustrative data and has not been validated as a useful client deliverable.
3. Only then consider `migrations/20260922_campaign_reports.sql`, re-enable the API routes and dashboard entry points, deploy the server and static files together, and test with a real linked campaign.
4. Verify that the brand sees only its version and that agency notes and the fixed fee are absent. Agency/brand login fields are independent and live in `migrations/20260923_account_roles.sql`; do not apply the shelved report migration merely to enable sign-up.

The report migration has **not** been applied to production by this change. The prototype test `node tests/campaign_reports_test.cjs` requires temporarily re-enabling the report routes and dashboard entry points; it is not part of the active test suite. Its illustrative PDF remains at `output/pdf/ccf-brand-report-sample.pdf` for reference only.
