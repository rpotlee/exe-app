-- STAGED ONLY: verify a backup before applying. Shared admission for the two AI Edge Functions.
-- This table contains counters and lease IDs only: no API keys, prompts, task text, or generated work.
create table ai_admission (
  owner_id uuid primary key,
  lease_id uuid,
  lease_until timestamptz not null default '-infinity',
  next_allowed_at timestamptz not null default '-infinity',
  cooldown_until timestamptz not null default '-infinity',
  window_started_at timestamptz not null default now(),
  reserved_tokens integer not null default 0 check (reserved_tokens >= 0),
  provider_remaining_tokens integer,
  provider_reset_at timestamptz not null default '-infinity'
);
alter table ai_admission enable row level security;
revoke all on ai_admission from public, anon, authenticated, exe_ai;
grant all on ai_admission to service_role;

create function exe_ai_acquire(p_owner uuid, p_lease uuid, p_tokens integer) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  r ai_admission%rowtype;
  t timestamptz := clock_timestamp();
  wait_until timestamptz;
begin
  if p_owner is null or p_lease is null or p_tokens is null or p_tokens < 1 or p_tokens > 6000 then
    raise exception 'Invalid AI admission request';
  end if;
  insert into ai_admission(owner_id) values(p_owner) on conflict do nothing;
  select * into r from ai_admission where owner_id = p_owner for update;
  if r.window_started_at + interval '60 seconds' <= t then
    r.window_started_at := t;
    r.reserved_tokens := 0;
  end if;
  if r.provider_reset_at <= t then r.provider_remaining_tokens := null; end if;
  wait_until := greatest(r.next_allowed_at, r.cooldown_until,
    case when r.lease_id is not null then r.lease_until else '-infinity'::timestamptz end,
    case when r.reserved_tokens + p_tokens > 6000 then r.window_started_at + interval '60 seconds' else '-infinity'::timestamptz end,
    case when r.provider_remaining_tokens is not null and r.provider_remaining_tokens < p_tokens then r.provider_reset_at else '-infinity'::timestamptz end);
  if wait_until > t then
    return jsonb_build_object('granted', false, 'retryAfterSeconds', greatest(1, ceil(extract(epoch from wait_until - t))::integer));
  end if;
  update ai_admission set
    lease_id = p_lease, lease_until = t + interval '90 seconds', next_allowed_at = t + interval '3 seconds',
    window_started_at = r.window_started_at, reserved_tokens = r.reserved_tokens + p_tokens,
    provider_remaining_tokens = case when r.provider_remaining_tokens is null then null else greatest(0,r.provider_remaining_tokens - p_tokens) end
  where owner_id = p_owner;
  return jsonb_build_object('granted', true);
end $$;

create function exe_ai_release(p_owner uuid, p_lease uuid, p_reserved integer, p_used integer default null,
  p_retry_seconds integer default 0, p_remaining_tokens integer default null, p_reset_seconds integer default 60) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare n integer; t timestamptz := clock_timestamp();
begin
  -- Lease fencing: an expired worker cannot release/refund a successor's reservation.
  update ai_admission set lease_id = null, lease_until = '-infinity',
    reserved_tokens = greatest(0, reserved_tokens + case when p_used is not null and p_used >= 0 then p_used - greatest(0,p_reserved) else 0 end),
    cooldown_until = greatest(cooldown_until, t + make_interval(secs => least(86400,greatest(0,coalesce(p_retry_seconds,0))))),
    provider_remaining_tokens = case when p_remaining_tokens is not null then greatest(0,p_remaining_tokens) else provider_remaining_tokens end,
    provider_reset_at = case when p_remaining_tokens is not null then t + make_interval(secs => least(86400,greatest(1,coalesce(p_reset_seconds,60)))) else provider_reset_at end
  where owner_id = p_owner and lease_id = p_lease;
  get diagnostics n = row_count;
  return n = 1;
end $$;

revoke all on function exe_ai_acquire(uuid,uuid,integer) from public, anon, authenticated, exe_ai;
revoke all on function exe_ai_release(uuid,uuid,integer,integer,integer,integer,integer) from public, anon, authenticated, exe_ai;
grant execute on function exe_ai_acquire(uuid,uuid,integer) to service_role;
grant execute on function exe_ai_release(uuid,uuid,integer,integer,integer,integer,integer) to service_role;
