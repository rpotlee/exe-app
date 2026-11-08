-- Supabase grants every new table in `public` to anon/authenticated by default, which silently undid the column and
-- append-only locks in migration 1 (found by running the rule check against a real project: the AI key was readable
-- and the audit history editable by a signed-in user). Take everything back, then grant exactly what is intended.
revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'postgres') then
    alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
  end if;
end $$;

-- signed-in users: their own rows only (row-level security), and only these operations
grant select, insert, update, delete on folders, outcomes, focus_assignments, tasks, captures, decisions, decision_options, ideas, relationships, user_settings, ai_proposals, idempotency_keys to authenticated;
grant select, insert on decision_log to authenticated;      -- append-only; rows go away only with their decision
grant select, insert on audit_events to authenticated;      -- append-only for users too
grant select (owner_id, provider, model, key_last4, enabled, disclosure_accepted_at, created_at, updated_at, revision) on user_ai_settings to authenticated;
grant update (model, enabled, disclosure_accepted_at) on user_ai_settings to authenticated;   -- the key is written only by a server function
grant select on v_active_blocks, v_blocked_items to authenticated, exe_ai;
-- signed-out visitors (anon): nothing at all
