-- ==========================================================================
-- Creator Cash Flow - Step 4: Row-Level Security (RLS) & Production Hardening
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/iekofqagtcztyavhunai/sql/new
-- ==========================================================================

BEGIN;

-- 1. Ensure role and organization_id columns exist on public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'creator';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS organization_id TEXT;

-- 2. Drop insecure "open beta" policies from all core tables
DROP POLICY IF EXISTS "Allow public read/write during beta" ON public.users;
DROP POLICY IF EXISTS "Allow public read/write during beta" ON public.transactions;
DROP POLICY IF EXISTS "Allow public read/write during beta" ON public.onboarding_responses;
DROP POLICY IF EXISTS "Allow public read/write during beta" ON public.admin_users;
DROP POLICY IF EXISTS "Allow public read/write during beta" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow public read/write during beta" ON public.ai_telemetry;

-- 3. Ensure Row-Level Security is enabled across all core tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_telemetry ENABLE ROW LEVEL SECURITY;

-- 4. Revoke raw access from anonymous and non-service-role clients
REVOKE ALL ON public.users FROM anon, authenticated;
REVOKE ALL ON public.transactions FROM anon, authenticated;
REVOKE ALL ON public.onboarding_responses FROM anon, authenticated;
REVOKE ALL ON public.admin_users FROM anon, authenticated;
REVOKE ALL ON public.audit_logs FROM anon, authenticated;
REVOKE ALL ON public.ai_telemetry FROM anon, authenticated;

-- 5. Grant full administrative privileges to the backend service_role only
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_responses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_telemetry TO service_role;

COMMIT;
