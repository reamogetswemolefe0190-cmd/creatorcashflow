-- Required for persistent campaign deliverable decisions.
-- Apply after 20260909_campaign_collaboration.sql, before enabling the live workflow UI.
begin;

alter table public.campaign_metric_snapshots
  add column if not exists entered_by text references public.users(id) on delete set null;

create table if not exists public.campaign_deliverable_events (
  id text primary key,
  campaign_id text not null references public.campaigns(id) on delete cascade,
  deliverable_id text not null references public.campaign_deliverables(id) on delete cascade,
  actor_user_id text not null references public.users(id) on delete restrict,
  event_type text not null check (event_type in ('planned','submit','request_revision','approve','publish')),
  note text not null default '',
  content_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_deliverable_events_campaign
  on public.campaign_deliverable_events(campaign_id, created_at asc);

create table if not exists public.campaign_brand_requests (
  id text primary key,
  campaign_id text not null references public.campaigns(id) on delete cascade,
  brand_organization_id text not null references public.organizations(id) on delete cascade,
  requested_by text not null references public.users(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  responded_by text references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists idx_campaign_brand_requests_org
  on public.campaign_brand_requests(brand_organization_id, status);
create unique index if not exists idx_campaign_brand_one_pending
  on public.campaign_brand_requests(campaign_id) where status = 'pending';

alter table public.campaign_deliverable_events enable row level security;
alter table public.campaign_brand_requests enable row level security;
revoke all privileges on table public.campaign_deliverable_events from anon, authenticated;
revoke all privileges on table public.campaign_brand_requests from anon, authenticated;
grant select,insert,update,delete on table public.campaign_deliverable_events to service_role;
grant select,insert,update,delete on table public.campaign_brand_requests to service_role;

commit;
