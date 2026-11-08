-- Safe retries. The app sends each user action with a unique key. If the same key arrives again (a retry after a lost
-- response, or after reconnecting) the writes are NOT applied twice. The key is stored only when the writes succeed, so a
-- failed attempt can be retried. Reusing a key with different writes is an error.
create or replace function exe_apply_writes_once(p_key text, p_writes jsonb) returns boolean
language plpgsql security invoker set search_path = public as $$
declare h text := md5(p_writes::text); n int; prior text;
begin
  insert into idempotency_keys (key, request_hash) values (p_key, h) on conflict (owner_id, key) do nothing;
  get diagnostics n = row_count;
  if n = 0 then
    select request_hash into prior from idempotency_keys where key = p_key;
    if prior is distinct from h then raise exception 'idempotency key reused with different writes' using errcode = '22023'; end if;
    return false;                       -- already applied: nothing to do
  end if;
  perform exe_apply_writes(p_writes);   -- if this raises, the key insert above is rolled back too
  return true;
end $$;
revoke all on function exe_apply_writes_once(text, jsonb) from public, anon;
grant execute on function exe_apply_writes_once(text, jsonb) to authenticated;
