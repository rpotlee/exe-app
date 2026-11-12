-- Additive execution state. Apply after 14_ai_admission; no provider credentials or prompt text is stored here.
create table ai_limits (
  id boolean primary key default true check (id),
  owner_tokens_per_day integer not null default 50000 check (owner_tokens_per_day between 1000 and 10000000),
  owner_tokens_per_minute integer not null default 6000 check (owner_tokens_per_minute between 100 and 10000000),
  owner_min_spacing_seconds integer not null default 3 check (owner_min_spacing_seconds between 0 and 3600),
  system_tokens_per_day integer not null default 1000000 check (system_tokens_per_day between 1000 and 100000000),
  system_tokens_per_minute integer not null default 30000 check (system_tokens_per_minute between 1000 and 10000000),
  system_requests_per_minute integer not null default 300 check (system_requests_per_minute between 1 and 100000),
  owner_micro_usd_per_day numeric(18,4) not null default 1000000 check (owner_micro_usd_per_day > 0),
  system_micro_usd_per_day numeric(18,4) not null default 10000000 check (system_micro_usd_per_day > 0),
  fallback_micro_usd_per_million numeric(18,4) not null default 10000000 check (fallback_micro_usd_per_million > 0),
  max_background_attempts integer not null default 3 check (max_background_attempts between 1 and 10),
  background_enabled boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
insert into ai_limits(id) values (true);
alter table user_ai_settings add column analysis_model text check (analysis_model is null or analysis_model ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,98}$');
grant select (analysis_model) on user_ai_settings to authenticated;
create table ai_provider_limits (
  provider text primary key check (provider in ('anthropic','openai','gemini','groq')),
  tokens_per_minute integer not null default 30000 check (tokens_per_minute between 100 and 10000000),
  requests_per_minute integer not null default 120 check (requests_per_minute between 1 and 100000),
  min_spacing_seconds integer not null default 0 check (min_spacing_seconds between 0 and 3600),
  window_started_at timestamptz not null default now(), reserved_tokens integer not null default 0, window_requests integer not null default 0,
  next_allowed_at timestamptz not null default '-infinity',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
insert into ai_provider_limits(provider) values ('anthropic'),('openai'),('gemini'),('groq');
create table ai_global_admission (
  id boolean primary key default true check (id),
  window_started_at timestamptz not null default now(), window_tokens integer not null default 0, window_requests integer not null default 0,
  day_started_at date not null default current_date, day_tokens integer not null default 0, day_micro_usd numeric(18,4) not null default 0
);
insert into ai_global_admission(id) values (true);
alter table ai_admission add column day_started_at date not null default current_date;
alter table ai_admission add column day_tokens integer not null default 0;
alter table ai_admission add column day_micro_usd numeric(18,4) not null default 0;
alter table ai_admission add column lease_micro_usd numeric(18,4);
alter table ai_admission add column lease_rate_source text;
alter table ai_admission add column lease_provider text;
alter table ai_admission add column lease_model text;
alter table ai_admission add column lease_class text check (lease_class in ('interactive','background'));
alter table ai_admission add column lease_started_at timestamptz;
alter table ai_admission add column last_interactive_at timestamptz not null default '-infinity';

-- Operators may populate rates for models they actually use. Null cost means unknown, never zero.
create table ai_model_rates (
  provider text not null check (provider in ('anthropic','openai','gemini','groq')),
  model text not null,
  input_micro_usd_per_million numeric(18,4) not null check (input_micro_usd_per_million >= 0),
  output_micro_usd_per_million numeric(18,4) not null check (output_micro_usd_per_million >= 0),
  primary key(provider, model)
);
create table ai_usage (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null,
  provider text not null, model text not null, request_class text not null check (request_class in ('interactive','background')),
  status text not null check (status in ('ok','error','unknown')),
  reserved_tokens integer not null, used_tokens integer,
  estimated_micro_usd numeric(18,4), rate_source text not null check (rate_source in ('configured','fallback')), latency_ms integer,
  created_at timestamptz not null default now()
);
create index ai_usage_owner_at on ai_usage(owner_id,created_at desc);
create table ai_jobs (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null,
  kind text not null check (kind in ('organization')),
  dedupe_key text not null, capture_ids uuid[] not null check (cardinality(capture_ids) between 1 and 4),
  state text not null default 'queued' check (state in ('queued','running','done','failed')),
  attempts integer not null default 0, lease_id uuid, lease_until timestamptz,
  available_at timestamptz not null default now(), last_error_code text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(owner_id,dedupe_key)
);
create index ai_jobs_ready on ai_jobs(available_at,created_at) where state in ('queued','running');
create table ai_intelligence (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null,
  job_id uuid references ai_jobs(id) on delete set null,
  dedupe_key text not null, provider text not null, model text not null,
  source_revisions jsonb not null, result jsonb not null,
  dismissed_group_keys text[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(owner_id,dedupe_key),
  check (pg_column_size(source_revisions) < 2048 and pg_column_size(result) < 16384)
);
create index ai_intelligence_owner_at on ai_intelligence(owner_id,created_at desc);

alter table ai_limits enable row level security;
alter table ai_provider_limits enable row level security;
alter table ai_global_admission enable row level security;
alter table ai_model_rates enable row level security;
alter table ai_usage enable row level security;
alter table ai_jobs enable row level security;
alter table ai_intelligence enable row level security;
revoke all on ai_limits,ai_provider_limits,ai_global_admission,ai_model_rates,ai_usage,ai_jobs,ai_intelligence from public,anon,authenticated,exe_ai;
grant all on ai_limits,ai_provider_limits,ai_global_admission,ai_model_rates,ai_usage,ai_jobs,ai_intelligence to service_role;
create policy intelligence_owner_read on ai_intelligence for select to authenticated using (owner_id = auth.uid());
grant select on ai_intelligence to authenticated;
create function exe_ai_dismiss_group(p_owner uuid,p_id uuid,p_key text) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare n integer;
begin
  if p_owner is null or length(p_key)>500 then return false; end if;
  update ai_intelligence set dismissed_group_keys=array_append(dismissed_group_keys,p_key),updated_at=clock_timestamp()
  where id=p_id and owner_id=p_owner and not (p_key=any(dismissed_group_keys));
  get diagnostics n=row_count;
  return n=1;
end $$;
revoke all on function exe_ai_dismiss_group(uuid,uuid,text) from public,anon,authenticated,exe_ai;
grant execute on function exe_ai_dismiss_group(uuid,uuid,text) to service_role;
create policy usage_owner_read on ai_usage for select to authenticated using (owner_id = auth.uid());
grant select on ai_usage to authenticated;

-- Service-only, fenced claim. The caller has already authenticated the owner; it cannot choose another user's job.
create function exe_ai_claim_job(p_owner uuid,p_job uuid,p_lease uuid,p_interactive boolean default false) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare r ai_jobs%rowtype; lim ai_limits%rowtype; t timestamptz := clock_timestamp();
begin
  select * into lim from ai_limits where id = true;
  select * into r from ai_jobs where owner_id=p_owner and id=p_job for update;
  if not found then return jsonb_build_object('claimed',false,'reason','missing'); end if;
  if r.state='done' or (r.state='failed' and not p_interactive) then return jsonb_build_object('claimed',false,'reason',r.state); end if;
  if r.state='running' and r.lease_until>t then return jsonb_build_object('claimed',false,'reason','running'); end if;
  if r.available_at>t then return jsonb_build_object('claimed',false,'reason','backoff'); end if;
  if r.attempts>=lim.max_background_attempts and not p_interactive then
    update ai_jobs set state='failed',last_error_code='MAX_ATTEMPTS',updated_at=t where id=p_job;
    return jsonb_build_object('claimed',false,'reason','failed');
  end if;
  update ai_jobs set state='running',attempts=case when p_interactive and attempts>=lim.max_background_attempts then 1 else attempts+1 end,
    lease_id=p_lease,lease_until=t+interval '90 seconds',updated_at=t where id=p_job;
  return jsonb_build_object('claimed',true,'captureIds',r.capture_ids);
end $$;
create function exe_ai_finish_job(p_owner uuid,p_job uuid,p_lease uuid,p_ok boolean,p_error_code text default null) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare n integer; t timestamptz := clock_timestamp();
begin
  update ai_jobs set state=case when p_ok then 'done' else 'queued' end,
    lease_id=null,lease_until=null,
    available_at=case when p_ok then t else t+make_interval(secs=>least(3600,10*power(2,least(attempts,8))::integer)) end,
    last_error_code=case when p_ok then null else left(coalesce(p_error_code,'AI_ERROR'),64) end,updated_at=t
  where owner_id=p_owner and id=p_job and state='running' and lease_id=p_lease;
  get diagnostics n=row_count; return n=1;
end $$;
create function exe_ai_save_intelligence(p_owner uuid,p_job uuid,p_lease uuid,p_provider text,p_model text,p_revisions jsonb,p_result jsonb) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare j ai_jobs%rowtype; cid uuid; cap record; n integer;
begin
  select * into j from ai_jobs where id=p_job and owner_id=p_owner for update;
  if not found or j.state<>'running' or j.lease_id is distinct from p_lease or j.lease_until<=clock_timestamp() then return false; end if;
  if jsonb_typeof(p_revisions)<>'object' or (select count(*) from jsonb_object_keys(p_revisions))<>cardinality(j.capture_ids)
    or jsonb_typeof(p_result)<>'object' or pg_column_size(p_result)>=16384 then return false; end if;
  foreach cid in array j.capture_ids loop
    select revision,kind,status,archived_at,completed_at into cap from captures where owner_id=p_owner and id=cid for share;
    if not found or cap.kind<>'todo' or cap.status<>'pending' or cap.archived_at is not null or cap.completed_at is not null
      or (p_revisions->>cid::text) is null or cap.revision::text<>(p_revisions->>cid::text) then return false; end if;
  end loop;
  insert into ai_intelligence(owner_id,job_id,dedupe_key,provider,model,source_revisions,result)
  values(p_owner,p_job,j.dedupe_key,p_provider,p_model,p_revisions,p_result)
  on conflict(owner_id,dedupe_key) do nothing;
  update ai_jobs set state='done',lease_id=null,lease_until=null,last_error_code=null,updated_at=clock_timestamp() where id=p_job;
  insert into audit_events(owner_id,actor,action,after)
  values(p_owner,'ai','ai-analysis',jsonb_build_object('entries',cardinality(j.capture_ids),
    'groups',jsonb_array_length(coalesce(p_result->'groups','[]'::jsonb)),
    'dependencies',jsonb_array_length(coalesce(p_result->'dependencies','[]'::jsonb))));
  return true;
end $$;
revoke all on function exe_ai_claim_job(uuid,uuid,uuid,boolean),exe_ai_finish_job(uuid,uuid,uuid,boolean,text) from public,anon,authenticated,exe_ai;
grant execute on function exe_ai_claim_job(uuid,uuid,uuid,boolean),exe_ai_finish_job(uuid,uuid,uuid,boolean,text) to service_role;
revoke all on function exe_ai_save_intelligence(uuid,uuid,uuid,text,text,jsonb,jsonb) from public,anon,authenticated,exe_ai;
grant execute on function exe_ai_save_intelligence(uuid,uuid,uuid,text,text,jsonb,jsonb) to service_role;

-- Replace the old gate without changing its 3-argument compatibility. Every call locks global, provider, then owner.
drop function exe_ai_acquire(uuid,uuid,integer);
create function exe_ai_acquire(p_owner uuid,p_lease uuid,p_tokens integer,p_class text default 'interactive',p_model text default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare r ai_admission%rowtype; g ai_global_admission%rowtype; lim ai_limits%rowtype;
        p ai_provider_limits%rowtype; cfg record; rate record; unit_rate numeric; rate_source text; predicted numeric;
        t timestamptz := clock_timestamp(); wait_until timestamptz;
begin
  if p_owner is null or p_lease is null or p_tokens is null or p_tokens<1 or p_tokens>6000 or p_class not in ('interactive','background') then raise exception 'Invalid AI admission request'; end if;
  select provider,model,analysis_model into cfg from user_ai_settings where owner_id=p_owner;
  if not found then cfg.provider := 'openai'; cfg.model := 'unknown'; cfg.analysis_model := null; end if;
  if p_model is not null then
    if p_model is distinct from cfg.model and p_model is distinct from cfg.analysis_model then raise exception 'Model is not configured for this owner'; end if;
    cfg.model:=p_model;
  end if;
  select * into lim from ai_limits where id=true;
  select * into rate from ai_model_rates where provider=cfg.provider and model=cfg.model;
  if found then unit_rate:=greatest(rate.input_micro_usd_per_million,rate.output_micro_usd_per_million); rate_source:='configured';
  else unit_rate:=lim.fallback_micro_usd_per_million; rate_source:='fallback'; end if;
  predicted:=p_tokens*unit_rate/1000000;
  select * into g from ai_global_admission where id=true for update;
  select * into p from ai_provider_limits where provider=cfg.provider for update;
  insert into ai_admission(owner_id) values(p_owner) on conflict do nothing;
  select * into r from ai_admission where owner_id=p_owner for update;
  if g.window_started_at+interval '60 seconds'<=t then g.window_started_at:=t; g.window_tokens:=0; g.window_requests:=0; end if;
  if g.day_started_at<>t::date then g.day_started_at:=t::date; g.day_tokens:=0; g.day_micro_usd:=0; end if;
  if p.window_started_at+interval '60 seconds'<=t then p.window_started_at:=t; p.reserved_tokens:=0; p.window_requests:=0; end if;
  if r.window_started_at+interval '60 seconds'<=t then r.window_started_at:=t; r.reserved_tokens:=0; end if;
  if r.day_started_at<>t::date then r.day_started_at:=t::date; r.day_tokens:=0; r.day_micro_usd:=0; end if;
  if r.provider_reset_at<=t then r.provider_remaining_tokens:=null; end if;
  if p_class='background' and not lim.background_enabled then return jsonb_build_object('granted',false,'retryAfterSeconds',3600,'code','BACKGROUND_DISABLED'); end if;
  if p_class='background' and r.last_interactive_at+interval '60 seconds'>t then
    return jsonb_build_object('granted',false,'retryAfterSeconds',greatest(1,ceil(extract(epoch from r.last_interactive_at+interval '60 seconds'-t))::integer),'code','INTERACTIVE_PRIORITY');
  end if;
  wait_until:=greatest(r.next_allowed_at,r.cooldown_until,p.next_allowed_at,
    case when r.lease_id is not null then r.lease_until else '-infinity'::timestamptz end,
    case when r.reserved_tokens+p_tokens>lim.owner_tokens_per_minute then r.window_started_at+interval '60 seconds' else '-infinity'::timestamptz end,
    case when p.reserved_tokens+p_tokens>p.tokens_per_minute then p.window_started_at+interval '60 seconds' else '-infinity'::timestamptz end,
    case when p.window_requests+1>p.requests_per_minute then p.window_started_at+interval '60 seconds' else '-infinity'::timestamptz end,
    case when g.window_tokens+p_tokens>lim.system_tokens_per_minute then g.window_started_at+interval '60 seconds' else '-infinity'::timestamptz end,
    case when g.window_requests+1>lim.system_requests_per_minute then g.window_started_at+interval '60 seconds' else '-infinity'::timestamptz end,
    case when r.provider_remaining_tokens is not null and r.provider_remaining_tokens<p_tokens then r.provider_reset_at else '-infinity'::timestamptz end);
  if r.day_tokens+p_tokens>lim.owner_tokens_per_day or g.day_tokens+p_tokens>lim.system_tokens_per_day
    or r.day_micro_usd+predicted>lim.owner_micro_usd_per_day or g.day_micro_usd+predicted>lim.system_micro_usd_per_day then
    return jsonb_build_object('granted',false,'retryAfterSeconds',greatest(1,ceil(extract(epoch from (t::date+1)::timestamptz-t))::integer),'code','DAILY_BUDGET');
  end if;
  if wait_until>t then return jsonb_build_object('granted',false,'retryAfterSeconds',greatest(1,ceil(extract(epoch from wait_until-t))::integer),'code','AI_COOLDOWN'); end if;
  update ai_global_admission set window_started_at=g.window_started_at,window_tokens=g.window_tokens+p_tokens,window_requests=g.window_requests+1,day_started_at=g.day_started_at,day_tokens=g.day_tokens+p_tokens,day_micro_usd=g.day_micro_usd+predicted where id=true;
  update ai_provider_limits set window_started_at=p.window_started_at,reserved_tokens=p.reserved_tokens+p_tokens,window_requests=p.window_requests+1,next_allowed_at=t+make_interval(secs=>p.min_spacing_seconds) where provider=cfg.provider;
  update ai_admission set lease_id=p_lease,lease_until=t+interval '90 seconds',lease_started_at=t,lease_provider=cfg.provider,lease_model=cfg.model,lease_class=p_class,
    lease_micro_usd=predicted,lease_rate_source=rate_source,
    last_interactive_at=case when p_class='interactive' then t else r.last_interactive_at end,
    next_allowed_at=t+make_interval(secs=>lim.owner_min_spacing_seconds),window_started_at=r.window_started_at,reserved_tokens=r.reserved_tokens+p_tokens,day_started_at=r.day_started_at,day_tokens=r.day_tokens+p_tokens,day_micro_usd=r.day_micro_usd+predicted,
    provider_remaining_tokens=case when r.provider_remaining_tokens is null then null else greatest(0,r.provider_remaining_tokens-p_tokens) end where owner_id=p_owner;
  return jsonb_build_object('granted',true);
end $$;

drop function exe_ai_release(uuid,uuid,integer,integer,integer,integer,integer);
create function exe_ai_release(p_owner uuid,p_lease uuid,p_reserved integer,p_used integer default null,p_retry_seconds integer default 0,
  p_remaining_tokens integer default null,p_reset_seconds integer default 60,p_status text default 'unknown',p_latency_ms integer default null) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare r ai_admission%rowtype; n integer; t timestamptz:=clock_timestamp(); delta integer; cost numeric; cost_delta numeric;
begin
  select * into r from ai_admission where owner_id=p_owner for update;
  if not found or r.lease_id is distinct from p_lease then return false; end if;
  delta:=case when p_used is not null and p_used>=0 then p_used-greatest(0,p_reserved) else 0 end;
  cost:=case when p_used is not null and p_used>=0 and p_reserved>0 then r.lease_micro_usd*p_used/p_reserved else r.lease_micro_usd end;
  cost_delta:=cost-r.lease_micro_usd;
  update ai_admission set lease_id=null,lease_until='-infinity',lease_started_at=null,lease_provider=null,lease_model=null,lease_class=null,lease_micro_usd=null,lease_rate_source=null,
    reserved_tokens=greatest(0,reserved_tokens+delta),day_tokens=greatest(0,day_tokens+delta),day_micro_usd=greatest(0,day_micro_usd+cost_delta),
    cooldown_until=greatest(cooldown_until,t+make_interval(secs=>least(86400,greatest(0,coalesce(p_retry_seconds,0))))),
    provider_remaining_tokens=case when p_remaining_tokens is not null then greatest(0,p_remaining_tokens) else provider_remaining_tokens end,
    provider_reset_at=case when p_remaining_tokens is not null then t+make_interval(secs=>least(86400,greatest(1,coalesce(p_reset_seconds,60)))) else provider_reset_at end where owner_id=p_owner;
  update ai_global_admission set window_tokens=greatest(0,window_tokens+delta),day_tokens=greatest(0,day_tokens+delta),day_micro_usd=greatest(0,day_micro_usd+cost_delta) where id=true;
  update ai_provider_limits set reserved_tokens=greatest(0,reserved_tokens+delta) where provider=r.lease_provider;
  insert into ai_usage(owner_id,provider,model,request_class,status,reserved_tokens,used_tokens,estimated_micro_usd,rate_source,latency_ms)
  values(p_owner,coalesce(r.lease_provider,'unknown'),coalesce(r.lease_model,'unknown'),coalesce(r.lease_class,'interactive'),
    case when p_status in ('ok','error','unknown') then p_status else 'unknown' end,p_reserved,p_used,cost,coalesce(r.lease_rate_source,'fallback'),p_latency_ms);
  return true;
end $$;
revoke all on function exe_ai_acquire(uuid,uuid,integer,text,text),exe_ai_release(uuid,uuid,integer,integer,integer,integer,integer,text,integer) from public,anon,authenticated,exe_ai;
grant execute on function exe_ai_acquire(uuid,uuid,integer,text,text),exe_ai_release(uuid,uuid,integer,integer,integer,integer,integer,text,integer) to service_role;
