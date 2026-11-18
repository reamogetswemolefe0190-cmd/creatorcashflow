-- Agency/brand account fields are independent of the shelved report prototype.
-- Run after 20260909_campaign_collaboration.sql when enabling role-based accounts.
begin;

alter table public.users add column if not exists role text not null default 'creator';
alter table public.users add column if not exists organization_id text;

commit;
