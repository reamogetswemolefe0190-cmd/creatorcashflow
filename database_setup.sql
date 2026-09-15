-- Creator Cash Flow Database Setup Script
-- Paste this script into your Supabase SQL Editor (https://supabase.com) and click Run.

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    phyllo_user_id TEXT,
    plan_tier TEXT DEFAULT 'Free',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS) or leave open for testing
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write during beta" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- 2. Create Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    source TEXT NOT NULL,
    merchant TEXT NOT NULL,
    type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
    category TEXT NOT NULL,
    tax_status TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write during beta" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

-- 3. Create Onboarding Responses Table
CREATE TABLE IF NOT EXISTS public.onboarding_responses (
    user_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    creator_type TEXT NOT NULL,
    platforms TEXT[] NOT NULL,
    goal TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.onboarding_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write during beta" ON public.onboarding_responses FOR ALL USING (true) WITH CHECK (true);

-- 4. Create Admin Users Table
CREATE TABLE IF NOT EXISTS public.admin_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write during beta" ON public.admin_users FOR ALL USING (true) WITH CHECK (true);

-- 5. Create Immutable Audit Trail Ledger Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    target_creator_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    ip_hash TEXT
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write during beta" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- 6. Create PII-Safe AI Query Telemetry Table
CREATE TABLE IF NOT EXISTS public.ai_telemetry (
    id TEXT PRIMARY KEY,
    category_tag TEXT NOT NULL,
    prompt_masked TEXT NOT NULL,
    tokens_used INT DEFAULT 0,
    model TEXT DEFAULT 'gemini-1.5-flash',
    latency_ms INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.ai_telemetry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write during beta" ON public.ai_telemetry FOR ALL USING (true) WITH CHECK (true);

-- 7. Performance B-tree Indexes for High-Concurrency Queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_telemetry_created_at ON public.ai_telemetry(created_at DESC);



-- 8. Create Instagram OAuth Tables
CREATE TABLE IF NOT EXISTS public.instagram_oauth_attempts (
    state_hash TEXT PRIMARY KEY,
    cookie_hash TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    result_code TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.instagram_connections (
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    instagram_id TEXT NOT NULL,
    page_id TEXT NOT NULL,
    username TEXT NOT NULL,
    meta_user_id TEXT NOT NULL,
    token_ciphertext TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    connected_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (user_id, instagram_id)
);

CREATE TABLE IF NOT EXISTS public.instagram_deletion_receipts (
    code TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.instagram_oauth_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_deletion_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write during beta" ON public.instagram_oauth_attempts;
DROP POLICY IF EXISTS "Allow public read/write during beta" ON public.instagram_connections;
DROP POLICY IF EXISTS "Allow public read/write during beta" ON public.instagram_deletion_receipts;
REVOKE ALL ON public.instagram_oauth_attempts, public.instagram_connections, public.instagram_deletion_receipts FROM public, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagram_oauth_attempts, public.instagram_connections, public.instagram_deletion_receipts TO service_role;

CREATE OR REPLACE FUNCTION public.replace_instagram_connections(p_user_id TEXT, p_connections JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF jsonb_typeof(p_connections) <> 'array' OR jsonb_array_length(p_connections) = 0 THEN
        RAISE EXCEPTION 'At least one Instagram connection is required';
    END IF;
    DELETE FROM public.instagram_connections existing
    WHERE existing.user_id = p_user_id
      AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_connections) item WHERE item->>'instagram_id' = existing.instagram_id);
    INSERT INTO public.instagram_connections
        (user_id, instagram_id, page_id, meta_user_id, username, token_ciphertext, expires_at, connected_at)
    SELECT p_user_id, item.instagram_id, item.page_id, item.meta_user_id, item.username,
        item.token_ciphertext, item.expires_at, item.connected_at
    FROM jsonb_to_recordset(p_connections) AS item(
        instagram_id TEXT, page_id TEXT, meta_user_id TEXT, username TEXT,
        token_ciphertext TEXT, expires_at TIMESTAMPTZ, connected_at TIMESTAMPTZ
    )
    WHERE item.instagram_id IS NOT NULL AND item.page_id IS NOT NULL
      AND item.meta_user_id IS NOT NULL AND item.token_ciphertext IS NOT NULL
    ON CONFLICT (user_id, instagram_id) DO UPDATE SET
        page_id = excluded.page_id, meta_user_id = excluded.meta_user_id,
        username = excluded.username, token_ciphertext = excluded.token_ciphertext,
        expires_at = excluded.expires_at, connected_at = excluded.connected_at;
END;
$$;
REVOKE ALL ON FUNCTION public.replace_instagram_connections(TEXT, JSONB) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_instagram_connections(TEXT, JSONB) TO service_role;
