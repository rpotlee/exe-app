-- When an outcome leaves Now, the database clears the current focus itself (exe_focus_cleanup). That is a system change,
-- not a user edit, so it must not bump the settings row's revision: otherwise the app's own follow-up write (choose a new
-- focus) would look stale and be rejected. (Found by running every app command against this schema.)
create or replace function exe_touch() returns trigger language plpgsql as $$
begin
  new.owner_id   := old.owner_id;            -- ownership never changes
  new.created_at := old.created_at;
  if current_setting('app.system_update', true) = '1' then
    new.updated_at := old.updated_at; new.revision := old.revision;
    return new;
  end if;
  new.updated_at := now();
  new.revision   := old.revision + 1;         -- clients guard writes with `where revision = <known>`
  return new;
end $$;

create or replace function exe_focus_cleanup() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' or new.lane <> 'now' then
    perform set_config('app.system_update', '1', true);
    update user_settings set current_focus_outcome_id = null
      where owner_id = old.owner_id and current_focus_outcome_id = old.outcome_id;
    perform set_config('app.system_update', '', true);
  end if;
  return null;
end $$;
