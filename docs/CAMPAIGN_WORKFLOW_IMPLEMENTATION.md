# Unshipped campaign workflow slice

This is a local implementation of the first priorities from `CREATORIQ_CCF_AUDIT_2026-09-23.md`. It has **not** been deployed or tested against the production Supabase database. It does not enable the shelved report generator or move money.

## What changed

- Campaign message read/write now checks active agency membership, active linked-brand membership, or an accepted creator assignment. Unrelated users receive 404.
- An agency can create a campaign from its dashboard; the creator dashboard no longer offers a broken agency campaign form. The former placeholder roster-invite modal and success-without-email endpoint have been removed/disabled.
- Agency managers can assign an already registered creator. The creator sees a pending assignment and accepts it in the creator workspace.
- An agency requests brand review access using the brand workspace ID. A manager in that brand workspace accepts or declines in-app. No email is claimed or sent by this flow.
- The live campaign page stores deliverables and their decision events: planned → submitted → changes requested or approved → published. Assigned creators submit HTTPS draft/published links; agency or linked-brand managers review.
- After a published link is recorded, the assigned creator or agency manager can add whole-number results. These are explicitly labelled **manually entered, not platform verified**.
- Creator views exclude the agency's aggregate campaign fee and other creators' deliverables. The report feature remains shelved.

## Before any production pilot

1. Review and apply `migrations/20260909_campaign_collaboration.sql`, then `migrations/20260911_campaign_messages.sql`, then `migrations/20260923_campaign_workflow.sql` in the target Supabase database. Confirm the existing account-role migration separately if agency/brand sign-up is intended. **Do not apply the shelved report migration.**
2. Deploy the server and new static campaign page/assets together. A partial deploy will fail because the UI requires the new routes and the routes require the migration.
3. Test in a non-production database with three real accounts (agency, brand, creator): create campaign, request/accept brand access, assign/accept creator, submit/revise/approve/publish, enter manual results, sign out/in, and confirm cross-tenant 404s.
4. Validate on phone widths and with keyboard/screen reader. The local automated suite checks API access and state transitions but does not replace a device/browser pass.

## Not yet shipped or claimed

- No automatic invitations or email ownership verification; brand access uses an in-app acceptance after an out-of-band workspace-ID exchange. Agency creator assignment requires an existing CCF account.
- No file upload, automated post matching, campaign-wide verified performance, client-facing PDF, creator payment transfer, invoice execution or bank connection.
- No separate agency roster database or full payment-status lifecycle. Current campaign fee is a recorded amount, not proof of spend or payment.
- Supabase writes for a deliverable transition and its event are separate requests; production hardening should make them atomic before relying on the event trail as an audit-grade record.

## Verification performed locally

`npm test` and `node tests/collaboration_flow_test.js` pass in memory-backup test mode. The collaboration test exercises cross-tenant denial, brand acceptance, creator consent, draft revision/approval/publish and manual-result labelling. This is **not** evidence that the migration has been applied or production email/Meta integrations work.
