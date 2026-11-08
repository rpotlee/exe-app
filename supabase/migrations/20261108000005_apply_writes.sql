-- One user action can change several rows (for example swapping a Now outcome). The app sends them to this function so they
-- apply together or not at all. It runs as the caller (security invoker), so row-level security and every rule in the schema
-- still apply; it only accepts the app's own tables and real column names.
create or replace function exe_apply_writes(p_writes jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare
  w jsonb; t text; op text; r jsonb; pkcol text; cols text[]; known int; n int;
  allowed text[] := array['folders','outcomes','focus_assignments','tasks','captures','decisions','decision_options','decision_log','ideas','relationships','user_settings','audit_events'];
begin
  if jsonb_typeof(p_writes) <> 'array' then raise exception 'writes must be a list' using errcode = '22023'; end if;
  for w in select * from jsonb_array_elements(p_writes) loop
    t := w->>'table'; op := w->>'op'; r := w->'row';
    if t is null or not (t = any (allowed)) then raise exception 'unknown table %', t using errcode = '22023'; end if;
    pkcol := case when t = 'user_settings' then 'owner_id' else 'id' end;
    if op = 'insert' then
      execute format('insert into %I select * from jsonb_populate_record(null::%I, $1)', t, t) using r;
    elsif op = 'update' then
      select coalesce(array_agg(k), '{}') into cols from jsonb_object_keys(r) k where k <> pkcol and k <> 'revision';
      select count(*) into known from information_schema.columns where table_schema = 'public' and table_name = t and column_name = any (cols);
      if coalesce(array_length(cols, 1), 0) = 0 or known <> array_length(cols, 1) then raise exception 'bad columns for %', t using errcode = '22023'; end if;
      execute format('update %I set (%s) = (select %s from jsonb_populate_record(null::%I, $1)) where %I = ($1->>%L)::uuid and revision = ($1->>''revision'')::int',
        t, (select string_agg(format('%I', c), ',') from unnest(cols) c), (select string_agg(format('%I', c), ',') from unnest(cols) c), t, pkcol, pkcol) using r;
      get diagnostics n = row_count;
      if n <> 1 then raise exception 'conflict: % changed underneath you', t using errcode = '40001'; end if;
    elsif op = 'delete' then
      execute format('delete from %I where %I = ($1->>%L)::uuid', t, pkcol, pkcol) using r;
    else
      raise exception 'unknown operation %', op using errcode = '22023';
    end if;
  end loop;
end $$;
revoke all on function exe_apply_writes(jsonb) from public, anon;
grant execute on function exe_apply_writes(jsonb) to authenticated;
