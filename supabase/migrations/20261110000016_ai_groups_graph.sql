-- Typed, read-only-to-clients projections of the existing organization analysis.
-- Approved groups still live in outcomes/tasks; approved dependencies still live in relationships.
create table ai_group_proposals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  intelligence_id uuid not null references ai_intelligence(id) on delete cascade,
  ordinal integer not null check (ordinal between 1 and 20),
  name text not null check (length(name) between 1 and 160),
  why text not null default '',
  capture_ids text[] not null check (cardinality(capture_ids) between 2 and 4),
  created_at timestamptz not null default now(),
  unique(intelligence_id, ordinal)
);
create index ai_group_proposals_owner on ai_group_proposals(owner_id,intelligence_id);
create table ai_dependency_proposals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  intelligence_id uuid not null references ai_intelligence(id) on delete cascade,
  ordinal integer not null check (ordinal between 1 and 20),
  before_capture_id text not null,
  after_capture_id text not null,
  why text not null default '',
  created_at timestamptz not null default now(),
  check (before_capture_id <> after_capture_id),
  unique(intelligence_id, ordinal)
);
create index ai_dependency_proposals_owner on ai_dependency_proposals(owner_id,intelligence_id);
alter table ai_group_proposals enable row level security;
alter table ai_dependency_proposals enable row level security;
revoke all on ai_group_proposals,ai_dependency_proposals from public,anon,authenticated,exe_ai;
grant all on ai_group_proposals,ai_dependency_proposals to service_role;
create policy ai_group_proposals_owner_read on ai_group_proposals for select to authenticated using (owner_id=auth.uid());
create policy ai_dependency_proposals_owner_read on ai_dependency_proposals for select to authenticated using (owner_id=auth.uid());
grant select on ai_group_proposals,ai_dependency_proposals to authenticated;

-- The analysis RPC inserts ai_intelligence under a capture-revision lock. This trigger
-- makes the two projections part of that same transaction, so no partial graph is visible.
create function exe_ai_index_intelligence() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into ai_group_proposals(owner_id,intelligence_id,ordinal,name,why,capture_ids,created_at)
  select new.owner_id,new.id,g.n,(g.value->>'name'),coalesce(g.value->>'why',''),
    array(select jsonb_array_elements_text(g.value->'ids')),new.created_at
  from jsonb_array_elements(case when jsonb_typeof(new.result->'groups')='array' then new.result->'groups' else '[]'::jsonb end) with ordinality as g(value,n)
  where g.n<=20 and jsonb_typeof(g.value->'ids')='array'
    and jsonb_array_length(g.value->'ids') between 2 and 4
    and length(coalesce(g.value->>'name','')) between 1 and 160;
  insert into ai_dependency_proposals(owner_id,intelligence_id,ordinal,before_capture_id,after_capture_id,why,created_at)
  select new.owner_id,new.id,d.n,d.value->>'before',d.value->>'after',coalesce(d.value->>'why',''),new.created_at
  from jsonb_array_elements(case when jsonb_typeof(new.result->'dependencies')='array' then new.result->'dependencies' else '[]'::jsonb end) with ordinality as d(value,n)
  where d.n<=20 and length(coalesce(d.value->>'before',''))>0
    and length(coalesce(d.value->>'after',''))>0
    and d.value->>'before'<>d.value->>'after';
  return new;
end $$;
revoke all on function exe_ai_index_intelligence() from public,anon,authenticated,exe_ai;
create trigger ai_intelligence_index after insert on ai_intelligence
for each row execute function exe_ai_index_intelligence();

-- Preserve analyses already written between the two additive migrations.
insert into ai_group_proposals(owner_id,intelligence_id,ordinal,name,why,capture_ids,created_at)
select i.owner_id,i.id,g.n,g.value->>'name',coalesce(g.value->>'why',''),
  array(select jsonb_array_elements_text(g.value->'ids')),i.created_at
from ai_intelligence i cross join lateral jsonb_array_elements(case when jsonb_typeof(i.result->'groups')='array' then i.result->'groups' else '[]'::jsonb end) with ordinality as g(value,n)
where g.n<=20 and jsonb_typeof(g.value->'ids')='array' and jsonb_array_length(g.value->'ids') between 2 and 4
  and length(coalesce(g.value->>'name','')) between 1 and 160
on conflict(intelligence_id,ordinal) do nothing;
insert into ai_dependency_proposals(owner_id,intelligence_id,ordinal,before_capture_id,after_capture_id,why,created_at)
select i.owner_id,i.id,d.n,d.value->>'before',d.value->>'after',coalesce(d.value->>'why',''),i.created_at
from ai_intelligence i cross join lateral jsonb_array_elements(case when jsonb_typeof(i.result->'dependencies')='array' then i.result->'dependencies' else '[]'::jsonb end) with ordinality as d(value,n)
where d.n<=20 and length(coalesce(d.value->>'before',''))>0 and length(coalesce(d.value->>'after',''))>0
  and d.value->>'before'<>d.value->>'after'
on conflict(intelligence_id,ordinal) do nothing;
