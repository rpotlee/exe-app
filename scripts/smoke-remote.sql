-- Rule smoke test for a real Supabase project. Everything is rolled back: the block ends by raising an error that carries the results.
do $$
declare r text := ''; a uuid := '00000000-0000-4000-8000-0000000000aa'; o uuid[] := '{}'; id uuid; t uuid; c uuid;
  procedure_ok boolean;
begin
  perform set_config('request.jwt.claim.sub', a::text, true);
  set local role authenticated;
  for i in 1..4 loop insert into outcomes (name) values ('o'||i) returning outcomes.id into id; o := o || id; end loop;
  for i in 1..3 loop insert into focus_assignments (outcome_id, lane) values (o[i], 'now'); end loop;
  begin insert into focus_assignments (outcome_id, lane) values (o[4], 'now'); r := r || E'FAIL now-cap allowed a 4th\n'; exception when others then r := r || E'ok   now-cap: ' || sqlerrm || E'\n'; end;
  begin update user_settings set current_focus_outcome_id = o[4]; insert into user_settings (current_focus_outcome_id) values (o[4]); r := r || E'FAIL focus not Now\n'; exception when others then r := r || E'ok   current focus must be Now: ' || sqlerrm || E'\n'; end;
  insert into tasks (name, outcome_id) values ('t1', o[1]) returning tasks.id into t;
  insert into relationships (from_type, from_id, to_type, to_id, kind, confirmed) values ('outcome', o[1], 'outcome', o[2], 'blocks', true), ('outcome', o[2], 'outcome', o[3], 'blocks', true);
  begin insert into relationships (from_type, from_id, to_type, to_id, kind) values ('outcome', o[3], 'outcome', o[1], 'blocks'); r := r || E'FAIL cycle allowed\n'; exception when others then r := r || E'ok   cycle: ' || sqlerrm || E'\n'; end;
  begin insert into relationships (from_type, from_id, to_type, to_id, kind) values ('outcome', o[1], 'outcome', o[1], 'blocks'); r := r || E'FAIL self-block allowed\n'; exception when others then r := r || E'ok   self-block: ' || sqlerrm || E'\n'; end;
  insert into captures (text) values ('Register the business') returning captures.id into c;
  begin update captures set text = 'changed' where captures.id = c; r := r || E'FAIL capture text changed\n'; exception when others then r := r || E'ok   capture text: ' || sqlerrm || E'\n'; end;
  begin perform key_ciphertext from user_ai_settings; r := r || E'FAIL key readable\n'; exception when others then r := r || E'ok   AI key hidden: ' || sqlerrm || E'\n'; end;
  begin insert into audit_events (actor, action) values ('user', 'x'); update audit_events set action = 'y'; r := r || E'FAIL audit editable\n'; exception when others then r := r || E'ok   audit append-only: ' || sqlerrm || E'\n'; end;
  reset role;
  perform set_config('app.owner_id', a::text, true);
  set local role exe_ai;
  begin update tasks set done_at = now(); r := r || E'FAIL AI completed a task\n'; exception when others then r := r || E'ok   AI cannot complete: ' || sqlerrm || E'\n'; end;
  begin delete from captures; r := r || E'FAIL AI deleted a capture\n'; exception when others then r := r || E'ok   AI cannot delete: ' || sqlerrm || E'\n'; end;
  reset role;
  raise exception E'RESULTS\n%', r;
end $$;
