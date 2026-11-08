-- Two "devices" for the same user on the REAL database: stale writes are refused (not overwritten) and retries never duplicate.
-- Everything is rolled back: the block ends by raising an error that carries the results.
do $$
declare u uuid := (select id from auth.users limit 1); r text := ''; o uuid := '40000000-0000-4000-8000-000000000001';
  rowj jsonb := '{"id":"40000000-0000-4000-8000-000000000001","owner_id":null,"folder_id":null,"name":"Shared outcome","description":"","pinned":false,"deadline":null,"effort":null,"done_at":null,"last_worked_at":null,"sources":[],"created_at":"2027-01-01T00:00:00Z","updated_at":"2027-01-01T00:00:00Z","revision":1}';
  applied boolean;
begin
  perform set_config('request.jwt.claim.sub', u::text, true);
  set local role authenticated;
  perform exe_apply_writes(jsonb_build_array(jsonb_build_object('table','outcomes','op','insert','row', rowj || jsonb_build_object('owner_id', u))));
  -- device A renames it (it knew revision 1)
  perform exe_apply_writes('[{"table":"outcomes","op":"update","row":{"id":"40000000-0000-4000-8000-000000000001","revision":1,"name":"Renamed on device A"}}]');
  r := r || E'ok   device A saved (revision now ' || (select revision from outcomes where id = o) || E')\n';
  -- device B, still on revision 1, tries to rename it: must be refused and must not overwrite A
  begin
    perform exe_apply_writes('[{"table":"outcomes","op":"update","row":{"id":"40000000-0000-4000-8000-000000000001","revision":1,"name":"Overwritten by device B"}}]');
    r := r || E'FAIL device B overwrote device A\n';
  exception when others then r := r || E'ok   device B refused: ' || sqlerrm || E'\n'; end;
  r := r || E'ok   name is still: ' || (select name from outcomes where id = o) || E'\n';
  -- retry with the same key after a "lost response": applied once only
  applied := exe_apply_writes_once('50000000-0000-4000-8000-000000000001', jsonb_build_array(jsonb_build_object('table','folders','op','insert','row', jsonb_build_object('id','40000000-0000-4000-8000-0000000000f1','owner_id',u,'name','Once','description','','icon','folder','position',0,'created_at','2027-01-01T00:00:00Z','updated_at','2027-01-01T00:00:00Z','revision',1))));
  r := r || E'ok   first send applied=' || applied || E'\n';
  applied := exe_apply_writes_once('50000000-0000-4000-8000-000000000001', jsonb_build_array(jsonb_build_object('table','folders','op','insert','row', jsonb_build_object('id','40000000-0000-4000-8000-0000000000f1','owner_id',u,'name','Once','description','','icon','folder','position',0,'created_at','2027-01-01T00:00:00Z','updated_at','2027-01-01T00:00:00Z','revision',1))));
  r := r || E'ok   retry applied=' || applied || ', folders named Once: ' || (select count(*) from folders where name = 'Once') || E'\n';
  reset role;
  raise exception E'RESULTS\n%', r;
end $$;
