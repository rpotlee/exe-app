-- Intelligent Assistant (assistant spec §10): one saved session per entry, holding the conversation, the prepared work (versioned) and the open question.
-- Additive and reversible. To undo: drop table assistant_sessions;
-- Only the server function writes it (it verifies the caller first); a signed-in person can read only their own rows, and cannot write at all,
-- so a forged request cannot plant a draft, an action or someone else's conversation.
create table assistant_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  capture_id uuid not null,
  capture_revision int not null default 1,           -- the entry revision the work was prepared for; an older number means "may be out of date"
  state jsonb not null default '{}',                  -- { question, artifact, versions[], actions[], turns[], processed[] }  (no keys, no prompts)
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), revision int not null default 1,
  unique (owner_id, id),
  unique (owner_id, capture_id),
  foreign key (owner_id, capture_id) references captures (owner_id, id) on delete cascade,
  check (pg_column_size(state) < 262144)
);
create trigger assistant_sessions_touch before update on assistant_sessions for each row execute function exe_touch();
alter table assistant_sessions enable row level security;
create policy assistant_sessions_owner_read on assistant_sessions for select to authenticated using (owner_id = auth.uid());
grant select on assistant_sessions to authenticated;
