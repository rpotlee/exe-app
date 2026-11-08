-- Server-side AI functions connect as `postgres` and then `set local role exe_ai` so that everything they do is limited to
-- reading the owner's rows and adding pending proposals. On Supabase `postgres` is not a superuser, so it must be a member
-- of exe_ai to switch into it. (Found by running the rule check against a real project.)
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'postgres') then grant exe_ai to postgres; end if;
end $$;
