# Campaign reports

Agency and brand workspaces now have a Reports section for linked campaigns. An agency owner or manager can create a dated snapshot containing a plain-language summary, published post links, publication dates, and optional manually entered reach, views, likes, comments, shares, and saves. Each entered result has an as-of date and is labelled **Manually supplied by agency**. Blank metrics remain blank; the PDF does not calculate an aggregate audience or claim Meta verification.

Agency members with owner, manager, or analyst access can download the agency PDF. A linked brand's active owner, manager, analyst, or brand viewer can download a separate brand PDF. Agency-only notes and the recorded fixed fee are excluded from the brand PDF. Brand users cannot create or edit reports. Both versions are generated from the saved snapshot, so later campaign edits do not silently change an issued report. A new report creates a new dated copy.

The report is an export of agency-entered campaign information, not proof of post performance. Review links and numbers with the client before relying on them. The brand sees a report only when its organisation is linked to the campaign. Creating that link and the wider approval workflow remain separate work; an unlinked campaign produces an agency-only report.

## Deployment

1. Apply `migrations/20260909_campaign_collaboration.sql` if it is not already installed.
2. Apply `migrations/20260922_campaign_reports.sql` in Supabase. This adds the report table and the user account fields required by agency/brand login.
3. Install the updated package lock, deploy the server and static files together, and sign in with a real agency and linked brand account.
4. In the agency Reports section, create a report and download its PDF. In the linked brand workspace, verify that only the brand PDF is available and that agency notes and the fixed fee are absent.

The migration has **not** been applied to production by this change. `node tests/campaign_reports_test.cjs` runs the API, PDF and mobile browser flow locally with temporary in-memory accounts and writes an illustrative PDF to `output/pdf/ccf-brand-report-sample.pdf`.
