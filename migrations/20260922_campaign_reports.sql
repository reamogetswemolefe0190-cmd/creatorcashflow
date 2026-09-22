-- Persistent, reviewed campaign report snapshots and role-aware account fields.
-- Run after 20260909_campaign_collaboration.sql.
begin;

alter table public.users add column if not exists role text not null default 'creator';
alter table public.users add column if not exists organization_id text;

create table if not exists public.campaign_reports (
  id text primary key,
  campaign_id text not null references public.campaigns(id) on delete cascade,
  created_by text not null references public.users(id) on delete restrict,
  summary text not null check (char_length(summary) between 10 and 2000),
  narrative jsonb not null default '{}'::jsonb check (jsonb_typeof(narrative) = 'object'),
  internal_notes text not null default '' check (char_length(internal_notes) <= 1000),
  posts jsonb not null default '[]'::jsonb check (jsonb_typeof(posts) = 'array'),
  campaign_snapshot jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.campaign_reports add column if not exists narrative jsonb not null default '{}'::jsonb;

create index if not exists idx_campaign_reports_campaign on public.campaign_reports(campaign_id,created_at desc);
alter table public.campaign_reports enable row level security;
revoke all privileges on table public.campaign_reports from anon, authenticated;
grant select,insert on table public.campaign_reports to service_role;

commit;
