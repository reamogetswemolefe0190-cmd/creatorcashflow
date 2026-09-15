-- Harden existing Instagram tables and atomically reconcile creator consent.
begin;

alter table public.instagram_connections enable row level security;
alter table public.instagram_oauth_attempts enable row level security;
alter table public.instagram_deletion_receipts enable row level security;

drop policy if exists "Allow public read/write during beta" on public.instagram_connections;
drop policy if exists "Allow public read/write during beta" on public.instagram_oauth_attempts;
drop policy if exists "Allow public read/write during beta" on public.instagram_deletion_receipts;

revoke all on public.instagram_connections, public.instagram_oauth_attempts,
  public.instagram_deletion_receipts from public, anon, authenticated;
grant select, insert, update, delete on public.instagram_connections,
  public.instagram_oauth_attempts, public.instagram_deletion_receipts to service_role;

create or replace function public.replace_instagram_connections(p_user_id text, p_connections jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if jsonb_typeof(p_connections) <> 'array' or jsonb_array_length(p_connections) = 0 then
    raise exception 'At least one Instagram connection is required';
  end if;
  delete from public.instagram_connections existing
  where existing.user_id = p_user_id
    and not exists (
      select 1 from jsonb_array_elements(p_connections) item
      where item->>'instagram_id' = existing.instagram_id
    );
  insert into public.instagram_connections
    (user_id, instagram_id, page_id, meta_user_id, username, token_ciphertext, expires_at, connected_at)
  select p_user_id, item.instagram_id, item.page_id, item.meta_user_id, item.username,
    item.token_ciphertext, item.expires_at, item.connected_at
  from jsonb_to_recordset(p_connections) as item(
    instagram_id text, page_id text, meta_user_id text, username text,
    token_ciphertext text, expires_at timestamptz, connected_at timestamptz
  )
  where item.instagram_id is not null and item.page_id is not null
    and item.meta_user_id is not null and item.token_ciphertext is not null
  on conflict (user_id, instagram_id) do update set
    page_id = excluded.page_id,
    meta_user_id = excluded.meta_user_id,
    username = excluded.username,
    token_ciphertext = excluded.token_ciphertext,
    expires_at = excluded.expires_at,
    connected_at = excluded.connected_at;
end;
$$;

revoke all on function public.replace_instagram_connections(text, jsonb) from public, anon, authenticated;
grant execute on function public.replace_instagram_connections(text, jsonb) to service_role;

commit;
