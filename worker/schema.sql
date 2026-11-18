-- Creator Cash Flow — D1 (SQLite) schema, translated from database_setup.sql + migrations/*.
-- Differences from Postgres: TEXT ids (app generates ids), ISO-8601 TEXT timestamps,
-- JSON columns stored as TEXT (the db shim parses/serializes known JSON columns),
-- NUMERIC -> REAL, no RLS (authorization is enforced in app code + tests).

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phyllo_user_id TEXT,
  plan_tier TEXT DEFAULT 'Free',
  status TEXT DEFAULT 'active',
  role TEXT NOT NULL DEFAULT 'creator',
  organization_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  source TEXT NOT NULL,
  merchant TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  category TEXT NOT NULL,
  tax_status TEXT NOT NULL,
  amount REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

CREATE TABLE IF NOT EXISTS onboarding_responses (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  creator_type TEXT NOT NULL,
  platforms TEXT NOT NULL, -- JSON array
  goal TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin' NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  target_creator_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ip_hash TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

CREATE TABLE IF NOT EXISTS ai_telemetry (
  id TEXT PRIMARY KEY,
  category_tag TEXT NOT NULL,
  prompt_masked TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  model TEXT DEFAULT 'gemini-1.5-flash',
  latency_ms INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_telemetry_created_at ON ai_telemetry(created_at DESC);

CREATE TABLE IF NOT EXISTS instagram_oauth_attempts (
  state_hash TEXT PRIMARY KEY,
  cookie_hash TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending','processing','complete','failed')),
  result_code TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS instagram_attempts_user_expiry ON instagram_oauth_attempts(user_id, expires_at);

CREATE TABLE IF NOT EXISTS instagram_connections (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instagram_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  username TEXT NOT NULL,
  meta_user_id TEXT NOT NULL,
  token_ciphertext TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  connected_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (user_id, instagram_id)
);

CREATE TABLE IF NOT EXISTS instagram_deletion_receipts (
  code TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  completed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS youtube_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  yt_channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  connected_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  type TEXT NOT NULL CHECK (type IN ('agency','brand')),
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS organization_members (
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','manager','analyst','creator','brand_viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (organization_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);

CREATE TABLE IF NOT EXISTS organization_invitations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager','analyst','creator','brand_viewer')),
  invited_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  expires_at TEXT NOT NULL,
  accepted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON organization_invitations(email, status);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  brand_organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 160),
  brief TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','inviting','active','review','complete','cancelled')),
  starts_on TEXT,
  ends_on TEXT,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  fixed_fee REAL NOT NULL DEFAULT 0 CHECK (fixed_fee >= 0),
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_campaigns_org ON campaigns(organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS campaign_creators (
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  consent_status TEXT NOT NULL DEFAULT 'invited' CHECK (consent_status IN ('invited','accepted','declined','revoked')),
  consented_at TEXT,
  data_scope TEXT NOT NULL DEFAULT '{"identity":true,"engagement":true,"audience":false,"income":false}', -- JSON
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (campaign_id, creator_user_id)
);
CREATE INDEX IF NOT EXISTS idx_campaign_creators_user ON campaign_creators(creator_user_id, consent_status);

CREATE TABLE IF NOT EXISTS campaign_deliverables (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  platform TEXT NOT NULL,
  external_content_id TEXT,
  content_url TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','submitted','revision','approved','published')),
  due_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_deliverables_campaign ON campaign_deliverables(campaign_id);

CREATE TABLE IF NOT EXISTS campaign_metric_snapshots (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  deliverable_id TEXT REFERENCES campaign_deliverables(id) ON DELETE CASCADE,
  creator_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'phyllo',
  metric_name TEXT NOT NULL,
  metric_value REAL NOT NULL CHECK (metric_value >= 0),
  captured_at TEXT NOT NULL,
  source_updated_at TEXT,
  entered_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_metrics_campaign_latest ON campaign_metric_snapshots(campaign_id, captured_at DESC);

CREATE TABLE IF NOT EXISTS campaign_access_grants (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  grantee_organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  grantee_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  granted_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  scope TEXT NOT NULL DEFAULT '{"deliverables":true,"engagement":true,"audience":false,"income":false}', -- JSON
  expires_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (grantee_organization_id IS NOT NULL OR grantee_user_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_access_campaign ON campaign_access_grants(campaign_id);

CREATE TABLE IF NOT EXISTS campaign_milestones (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  target_value REAL NOT NULL CHECK (target_value > 0),
  bonus_amount REAL NOT NULL DEFAULT 0 CHECK (bonus_amount >= 0),
  status TEXT NOT NULL DEFAULT 'tracking' CHECK (status IN ('tracking','verification','eligible','approved','disputed','paid')),
  reached_at TEXT,
  verification_ends_at TEXT,
  approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS campaign_messages (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  sender_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 2000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_campaign ON campaign_messages(campaign_id, created_at ASC);

CREATE TABLE IF NOT EXISTS campaign_reports (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  summary TEXT NOT NULL CHECK (length(summary) BETWEEN 10 AND 2000),
  narrative TEXT NOT NULL DEFAULT '{}', -- JSON object
  internal_notes TEXT NOT NULL DEFAULT '' CHECK (length(internal_notes) <= 1000),
  posts TEXT NOT NULL DEFAULT '[]', -- JSON array
  campaign_snapshot TEXT NOT NULL, -- JSON
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_campaign_reports_campaign ON campaign_reports(campaign_id, created_at DESC);

CREATE TABLE IF NOT EXISTS campaign_deliverable_events (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  deliverable_id TEXT NOT NULL REFERENCES campaign_deliverables(id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (event_type IN ('planned','submit','request_revision','approve','publish')),
  note TEXT NOT NULL DEFAULT '',
  content_url TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_deliverable_events_campaign ON campaign_deliverable_events(campaign_id, created_at ASC);

CREATE TABLE IF NOT EXISTS campaign_brand_requests (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  brand_organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  responded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  responded_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_campaign_brand_requests_org ON campaign_brand_requests(brand_organization_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_brand_one_pending ON campaign_brand_requests(campaign_id) WHERE status = 'pending';

-- One-time auth codes (signup verification + password reset). See migrations/0002_auth_codes.sql
CREATE TABLE IF NOT EXISTS auth_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('signup_code', 'password_reset')),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_auth_codes_email_purpose ON auth_codes(email, purpose);
