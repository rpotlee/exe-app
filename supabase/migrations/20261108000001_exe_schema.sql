-- Exe schema, first Phase 2 deliverable (DEC-005).
-- Eight core entities + supporting tables (AI proposals, audit/undo, idempotency keys, per-user AI settings).
-- Every row has an owner, created/updated timestamps and a revision number. Rules are enforced here, not only in the UI:
--   * at most three Now outcomes, exactly one (optional) current focus that must be a Now outcome
--   * no self-blocks and no dependency cycles; only CONFIRMED `blocks` relationships block anything
--   * AI can never delete or complete anything (role grants + guards); AI output can only become a proposal
--   * the original capture text is never changed or removed by anything except an explicit user delete
-- Written for Supabase (Postgres 15+). `auth.uid()` is provided by Supabase Auth.

-- ---------------------------------------------------------------- roles
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'exe_ai') then create role exe_ai nologin; end if;
end $$;
comment on role exe_ai is 'Used only by server-side AI functions. Can read the owner''s rows and insert proposals. Nothing else.';

-- ---------------------------------------------------------------- shared trigger: timestamps + revision
create or replace function exe_touch() returns trigger language plpgsql as $$
begin
  new.owner_id   := old.owner_id;            -- ownership never changes
  new.created_at := old.created_at;
  new.updated_at := now();
  new.revision   := old.revision + 1;         -- clients guard writes with `where revision = <known>`
  return new;
end $$;

-- ---------------------------------------------------------------- core entities
create table folders (                                  -- the "Workstream" entity, shown to users as a Folder
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  description text not null default '' check (char_length(description) <= 160),
  icon text not null default 'folder',
  position int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), revision int not null default 1,
  unique (owner_id, id)
);

create table outcomes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  folder_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 600),   -- the definition of done
  pinned boolean not null default false,
  deadline date,                                        -- user-entered only
  effort text check (effort is null or char_length(effort) <= 60),                -- user-entered estimate
  done_at timestamptz,                                  -- set only by a user-confirmed completion
  last_worked_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), revision int not null default 1,
  unique (owner_id, id),
  foreign key (owner_id, folder_id) references folders (owner_id, id) on delete set null (folder_id)
);

create table focus_assignments (                         -- FocusAssignment: which lane an outcome is in
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  outcome_id uuid not null,
  lane text not null check (lane in ('now', 'next', 'later', 'done')),
  position int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), revision int not null default 1,
  unique (owner_id, id),
  unique (outcome_id),
  foreign key (owner_id, outcome_id) references outcomes (owner_id, id) on delete cascade
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  outcome_id uuid,                                      -- null = a loose step
  name text not null check (char_length(btrim(name)) between 1 and 200),
  notes text not null default '',
  done_at timestamptz,                                  -- only a user-confirmed completion writes this
  archived_at timestamptz,
  deadline date,
  effort text check (effort is null or char_length(effort) <= 60),
  position int not null default 0,
  sources uuid[] not null default '{}',                 -- capture ids this task came from
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), revision int not null default 1,
  unique (owner_id, id),
  foreign key (owner_id, outcome_id) references outcomes (owner_id, id) on delete set null (outcome_id)
);

create table captures (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  text text not null check (char_length(btrim(text)) between 1 and 4000),   -- the original; never changed
  edited_text text check (edited_text is null or char_length(btrim(edited_text)) between 1 and 4000),
  source text not null default 'Quick Capture',
  folder_id uuid,
  batch_id uuid,                                        -- captures split from one pasted list share this
  batch_text text,                                      -- the original pasted block
  completed_at timestamptz,                             -- raw completion, independent of any task
  archived_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'organized')),
  organized_as text check (organized_as in ('Task', 'Outcome', 'Decision', 'Idea', 'Note', 'Merged')),
  review_state text check (review_state in ('deferred', 'rejected')),             -- null = waiting in the review list
  review_at timestamptz,
  rejected_fingerprints text[] not null default '{}',
  task_id uuid,                                         -- explicit link, set only when approved or linked by the user
  merged_into uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), revision int not null default 1,
  unique (owner_id, id),
  foreign key (owner_id, folder_id) references folders (owner_id, id) on delete set null (folder_id),
  foreign key (owner_id, task_id) references tasks (owner_id, id) on delete set null (task_id),
  foreign key (owner_id, merged_into) references captures (owner_id, id) on delete set null (merged_into)
);

create table decisions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  folder_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 600),
  status text not null default 'open' check (status in ('open', 'resolved')),
  evidence text not null default '',                    -- verified facts, kept apart from notes
  notes text not null default '',
  chosen_option text not null default '',
  conclusion text not null default '',
  rationale text not null default '',
  resolved_at timestamptz,                              -- AI can never resolve a decision
  sources uuid[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), revision int not null default 1,
  unique (owner_id, id),
  foreign key (owner_id, folder_id) references folders (owner_id, id) on delete set null (folder_id),
  check ((status = 'resolved') = (resolved_at is not null))
);

create table decision_options (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  decision_id uuid not null,
  text text not null check (char_length(btrim(text)) between 1 and 160),
  position int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), revision int not null default 1,
  unique (owner_id, id),
  foreign key (owner_id, decision_id) references decisions (owner_id, id) on delete cascade
);
create unique index decision_options_unique_text on decision_options (decision_id, lower(btrim(text)));

create table decision_log (                              -- dated, append-only history of a decision
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  decision_id uuid not null,
  type text not null check (type in ('created', 'edited', 'resolved', 'reopened')),
  text text not null default '',
  at timestamptz not null default now(),
  unique (owner_id, id),
  foreign key (owner_id, decision_id) references decisions (owner_id, id) on delete cascade
);

create table ideas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  folder_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  notes text not null default '',
  archived_at timestamptz,
  sources uuid[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), revision int not null default 1,
  unique (owner_id, id),
  foreign key (owner_id, folder_id) references folders (owner_id, id) on delete set null (folder_id)
);

create table relationships (                             -- the single authority for dependencies
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  from_type text not null check (from_type in ('outcome', 'task', 'decision')),
  from_id uuid not null,
  to_type text not null check (to_type in ('outcome', 'task', 'decision')),
  to_id uuid not null,
  kind text not null check (kind in ('blocks', 'informs', 'related')),
  description text not null default '' check (char_length(description) <= 160),
  confirmed boolean not null default false,             -- only confirmed `blocks` ever block anything
  source text not null default 'user' check (source in ('user', 'ai')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), revision int not null default 1,
  unique (owner_id, id),
  unique (owner_id, from_id, to_id, kind),
  check (from_id <> to_id)
);
create index relationships_to on relationships (owner_id, to_id);
create index relationships_from on relationships (owner_id, from_id);

-- one row per user: workspace name, the single current focus, small preferences
create table user_settings (
  owner_id uuid primary key default auth.uid(),
  workspace_name text not null default '' check (char_length(workspace_name) <= 60),
  current_focus_outcome_id uuid,                        -- at most one by construction; must be a Now outcome (trigger below)
  priority_dismissed text[] not null default '{}',      -- fingerprints of priority suggestions the user ignored
  research_opt_in boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), revision int not null default 1,
  foreign key (owner_id, current_focus_outcome_id) references outcomes (owner_id, id) on delete set null (current_focus_outcome_id)
);

-- ---------------------------------------------------------------- supporting tables
create table ai_proposals (                              -- AI output is stored here and nowhere else until a user approves it
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  capture_id uuid not null,
  source_version int not null,                          -- the capture revision the model saw
  schema_version text not null default '1',
  fingerprint text not null,                            -- same suggestion for the same version is not recycled
  suggested_type text check (suggested_type in ('Task', 'Outcome', 'Decision', 'Idea', 'Note')),
  suggested_folder_id uuid,
  suggested_outcome_id uuid,
  relationship_proposals jsonb not null default '[]',
  duplicate_candidate_ids uuid[] not null default '{}',
  research_suggestion jsonb,
  explanation text not null default '' check (char_length(explanation) <= 1000),
  uncertainties text[] not null default '{}',
  provider text,                                        -- 'anthropic' | 'openai' | 'gemini'
  model text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'edited_approved', 'deferred', 'rejected', 'superseded')),
  decided_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), revision int not null default 1,
  unique (owner_id, id),
  unique (owner_id, capture_id, source_version, fingerprint),
  foreign key (owner_id, capture_id) references captures (owner_id, id) on delete cascade
);

create table audit_events (                              -- append-only history for approvals, applies and undo
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  at timestamptz not null default now(),
  actor text not null check (actor in ('user', 'ai', 'system')),
  action text not null,
  entity_type text,
  entity_id uuid,
  proposal_id uuid,
  before jsonb,
  after jsonb,
  undo_of uuid
);
create index audit_events_owner_at on audit_events (owner_id, at desc);

create table idempotency_keys (                          -- a retried write returns the stored result instead of duplicating
  owner_id uuid not null default auth.uid(),
  key text not null check (char_length(key) between 8 and 128),
  request_hash text not null,
  response jsonb,
  created_at timestamptz not null default now(),
  primary key (owner_id, key)
);

create table user_ai_settings (                          -- bring-your-own-key (DEC-005). The key never reaches the browser.
  owner_id uuid primary key default auth.uid(),
  provider text not null check (provider in ('anthropic', 'openai', 'gemini')),
  model text not null check (char_length(btrim(model)) between 1 and 100),       -- chosen by the user; never hard-coded
  key_ciphertext bytea not null,                        -- encrypted by a server function; readable only by the service role
  key_last4 text not null check (char_length(key_last4) <= 4),
  enabled boolean not null default false,
  disclosure_accepted_at timestamptz,                   -- the user has seen that capture text goes to this provider
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), revision int not null default 1,
  check (not enabled or disclosure_accepted_at is not null)
);

-- ---------------------------------------------------------------- touch triggers
do $$ declare t text; begin
  foreach t in array array['folders','outcomes','focus_assignments','tasks','captures','decisions','decision_options','ideas','relationships','user_settings','ai_proposals','user_ai_settings'] loop
    execute format('create trigger %I before update on %I for each row execute function exe_touch()', t || '_touch', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- the original capture text is never changed
create or replace function exe_captures_keep_source() returns trigger language plpgsql as $$
begin
  if new.text is distinct from old.text then raise exception 'The original capture text cannot be changed; use edited_text' using errcode = '23514'; end if;
  return new;
end $$;
create trigger captures_keep_source before update on captures for each row execute function exe_captures_keep_source();

-- ---------------------------------------------------------------- Now cap (3) and the single current focus
create or replace function exe_focus_guard() returns trigger language plpgsql as $$
declare n int;
begin
  if tg_op in ('INSERT', 'UPDATE') and new.lane = 'now' then
    perform pg_advisory_xact_lock(hashtextextended('now-cap:' || new.owner_id::text, 0));   -- serialize concurrent writers
    select count(*) into n from focus_assignments where owner_id = new.owner_id and lane = 'now' and outcome_id <> new.outcome_id;
    if n >= 3 then raise exception 'At most three outcomes can be Now. Move one out first.' using errcode = '23514'; end if;
  end if;
  return new;
end $$;
create trigger focus_cap before insert or update on focus_assignments for each row execute function exe_focus_guard();

-- when an outcome leaves Now (or its assignment is removed) it can no longer be the current focus
create or replace function exe_focus_cleanup() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' or new.lane <> 'now' then
    update user_settings set current_focus_outcome_id = null
      where owner_id = old.owner_id and current_focus_outcome_id = old.outcome_id;
  end if;
  return null;
end $$;
create trigger focus_cleanup after update or delete on focus_assignments for each row execute function exe_focus_cleanup();

create or replace function exe_current_focus_guard() returns trigger language plpgsql as $$
begin
  if new.current_focus_outcome_id is not null and not exists (
    select 1 from focus_assignments where owner_id = new.owner_id and outcome_id = new.current_focus_outcome_id and lane = 'now') then
    raise exception 'The current focus must be one of the Now outcomes' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger current_focus_guard before insert or update on user_settings for each row execute function exe_current_focus_guard();

-- ---------------------------------------------------------------- relationships: valid ends, no cycles, AI can never confirm
create or replace function exe_rel_end_exists(p_owner uuid, p_type text, p_id uuid) returns boolean language sql stable as $$
  select case p_type
    when 'outcome'  then exists (select 1 from outcomes  where owner_id = p_owner and id = p_id)
    when 'task'     then exists (select 1 from tasks     where owner_id = p_owner and id = p_id)
    when 'decision' then exists (select 1 from decisions where owner_id = p_owner and id = p_id)
  end
$$;

create or replace function exe_rel_would_cycle(p_owner uuid, p_from uuid, p_to uuid) returns boolean language sql stable as $$
  with recursive walk(id) as (
    select p_to
    union
    select r.to_id from relationships r join walk w on r.from_id = w.id where r.owner_id = p_owner and r.kind = 'blocks'
  )
  select exists (select 1 from walk where id = p_from)
$$;

create or replace function exe_rel_guard() returns trigger language plpgsql as $$
declare t_outcome uuid;
begin
  if new.from_id = new.to_id then raise exception 'An item cannot be related to itself' using errcode = '23514'; end if;
  if not exe_rel_end_exists(new.owner_id, new.from_type, new.from_id) or not exe_rel_end_exists(new.owner_id, new.to_type, new.to_id) then
    raise exception 'Both ends of a relationship must exist and belong to you' using errcode = '23503';
  end if;
  -- a task and its own outcome are already linked
  if new.from_type = 'task' and new.to_type = 'outcome' then select outcome_id into t_outcome from tasks where id = new.from_id; if t_outcome = new.to_id then raise exception 'A task and its own outcome are already linked' using errcode = '23514'; end if; end if;
  if new.from_type = 'outcome' and new.to_type = 'task' then select outcome_id into t_outcome from tasks where id = new.to_id; if t_outcome = new.from_id then raise exception 'A task and its own outcome are already linked' using errcode = '23514'; end if; end if;
  if new.kind = 'blocks' and (tg_op = 'INSERT' or new.from_id <> old.from_id or new.to_id <> old.to_id or old.kind <> 'blocks')
     and exe_rel_would_cycle(new.owner_id, new.from_id, new.to_id) then
    raise exception 'That would create a dependency loop' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' and new.source = 'ai' then new.confirmed := false; end if;          -- an AI suggestion is never confirmed
  if tg_op = 'UPDATE' and new.confirmed and not old.confirmed and current_setting('app.actor', true) = 'ai' then
    raise exception 'Only you can confirm a relationship' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger relationships_guard before insert or update on relationships for each row execute function exe_rel_guard();

-- ---------------------------------------------------------------- append-only history
create or replace function exe_append_only() returns trigger language plpgsql as $$
begin raise exception '% is append-only', tg_table_name using errcode = '42501'; end $$;
create trigger audit_append_only before update or delete on audit_events for each row execute function exe_append_only();
create trigger decision_log_append_only before update on decision_log for each row execute function exe_append_only();

-- ---------------------------------------------------------------- what is blocked (confirmed blocks only)
create view v_active_blocks with (security_invoker = true) as
  select r.owner_id, r.id as relationship_id, r.from_type, r.from_id, r.to_type, r.to_id
  from relationships r
  where r.kind = 'blocks' and r.confirmed
    and not coalesce(case r.from_type
      when 'task'     then (select t.done_at is not null or t.archived_at is not null from tasks t where t.id = r.from_id)
      when 'outcome'  then (select o.done_at is not null from outcomes o where o.id = r.from_id)
      when 'decision' then (select d.status <> 'open' from decisions d where d.id = r.from_id)
    end, true);

create view v_blocked_items with (security_invoker = true) as
  select distinct b.owner_id, b.to_type as item_type, b.to_id as item_id
  from v_active_blocks b
  where case b.to_type
    when 'task'    then exists (select 1 from tasks t where t.id = b.to_id and t.done_at is null and t.archived_at is null)
    when 'outcome' then exists (select 1 from outcomes o where o.id = b.to_id and o.done_at is null)
    else false end;

-- ---------------------------------------------------------------- row-level security
do $$ declare t text; begin
  foreach t in array array['folders','outcomes','focus_assignments','tasks','captures','decisions','decision_options','decision_log','ideas','relationships','user_settings','ai_proposals','audit_events','idempotency_keys','user_ai_settings'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- users: full access to their own rows
do $$ declare t text; begin
  foreach t in array array['folders','outcomes','focus_assignments','tasks','captures','decisions','decision_options','decision_log','ideas','relationships','user_settings','ai_proposals','idempotency_keys'] loop
    execute format('create policy %I on %I for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t || '_owner', t);
  end loop;
end $$;
create policy audit_owner_read   on audit_events   for select to authenticated using (owner_id = auth.uid());
create policy audit_owner_insert on audit_events   for insert to authenticated with check (owner_id = auth.uid());
create policy ai_settings_owner_read   on user_ai_settings for select to authenticated using (owner_id = auth.uid());
create policy ai_settings_owner_update on user_ai_settings for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- AI role: may read the owner it was told to act for, and add pending proposals. The server sets app.owner_id after verifying the caller.
create or replace function exe_ai_owner() returns uuid language sql stable as $$ select nullif(current_setting('app.owner_id', true), '')::uuid $$;
do $$ declare t text; begin
  foreach t in array array['folders','outcomes','focus_assignments','tasks','captures','decisions','decision_options','ideas','relationships'] loop
    execute format('create policy %I on %I for select to exe_ai using (owner_id = exe_ai_owner())', t || '_ai_read', t);
  end loop;
end $$;
create policy ai_proposals_ai_read   on ai_proposals for select to exe_ai using (owner_id = exe_ai_owner());
create policy ai_proposals_ai_insert on ai_proposals for insert to exe_ai with check (owner_id = exe_ai_owner() and status = 'pending');

-- ---------------------------------------------------------------- privileges
revoke all on all tables in schema public from public, anon;
grant usage on schema public to authenticated, exe_ai;
grant select, insert, update, delete on folders, outcomes, focus_assignments, tasks, captures, decisions, decision_options, ideas, relationships, user_settings, ai_proposals, idempotency_keys to authenticated;
grant select, insert on decision_log to authenticated;   -- append-only; rows go away only with their decision
grant select, insert on audit_events to authenticated;                      -- append-only for users too
grant select (owner_id, provider, model, key_last4, enabled, disclosure_accepted_at, created_at, updated_at, revision) on user_ai_settings to authenticated;
grant update (model, enabled, disclosure_accepted_at) on user_ai_settings to authenticated;   -- the key itself is written only by a server function
grant select on v_active_blocks, v_blocked_items to authenticated, exe_ai;
grant select on folders, outcomes, focus_assignments, tasks, captures, decisions, decision_options, ideas, relationships to exe_ai;   -- read only
grant select, insert on ai_proposals to exe_ai;                              -- no update, no delete, nothing else
