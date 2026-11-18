#!/usr/bin/env bash
# ==========================================================================
# CCF Cloudflare cutover runbook. Run on a machine with network access and
# `npx cf login` done (or CLOUDFLARE_API_TOKEN set). Review each step before
# running; the script pauses for confirmation on destructive steps.
#
#   bash scripts/cf-cutover.sh
# ==========================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

step() { echo; echo "=== $* ==="; }
confirm() { read -rp "Proceed with: $* ? [y/N] " ans; [[ "$ans" =~ ^[Yy]$ ]] || { echo "aborted"; exit 1; }; }

step "0. Preflight"
npx cf whoami || { echo "Run: npx cf login first"; exit 1; }
node node_modules/wrangler/bin/wrangler.js deploy --dry-run

step "1. Create account resources (capture IDs into wrangler.jsonc)"
echo "D1:";    npx wrangler d1 create ccf-db
echo "KV:";    npx wrangler kv namespace create "ccf-kv"
echo "R2:";    npx wrangler r2 bucket create campaign-assets
echo "Paste the returned database_id / namespace id into wrangler.jsonc, then press enter."
read -r

step "2. Apply D1 schema on the remote database"
confirm "wrangler d1 migrations apply DB --remote"
npx wrangler d1 migrations apply DB --remote

step "3. Migrate data Supabase -> D1 (remote)"
node scripts/migrate-supabase-to-d1.cjs export
confirm "apply --remote (REPLACES all rows in remote D1)"
node scripts/migrate-supabase-to-d1.cjs apply --remote
node scripts/migrate-supabase-to-d1.cjs verify --remote

step "4. Migrate storage Supabase Storage -> R2 + rewrite content_url"
node scripts/migrate-storage-to-r2.cjs copy --remote
confirm "rewrite content_url rows in remote D1"
node scripts/migrate-storage-to-r2.cjs rewrite --remote

step "5. Secrets (never commit these)"
for s in JWT_SECRET ENCRYPTION_KEY ADMIN_PASSWORD RESEND_API_KEY PHYLLO_CLIENT_SECRET YOUTUBE_CLIENT_SECRET GEMINI_API_KEY OPENROUTER_API_KEY; do
  echo "setting $s"; npx wrangler secret put "$s" --name ccf-app
done
# non-secret vars for prod are set in wrangler.jsonc [vars] / env sections; set APP_ORIGIN=https://creatorcashflow.co.za

step "6. Deploy"
confirm "wrangler deploy (production)"
npx wrangler deploy

step "7. DNS cutover"
echo "Add creatorcashflow.co.za as a zone in this Cloudflare account, then attach"
echo "the Worker as a custom domain (dashboard: Workers & Pages > ccf-app > Triggers"
echo "> Custom Domains, or API). Verify https://creatorcashflow.co.za/api/health"
echo "reports Cloudflare D1 before switching traffic. Keep Supabase read-only for"
echo "24-48h as a rollback source, then pause/delete the Supabase project."
