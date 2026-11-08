-- Revamp phase 1 (additive, reversible): what kind of entry a capture is, chosen by the user, and an optional user-set priority label.
-- Every existing capture becomes a to-do: the old Inbox was a checkable to-do list. Nothing else changes; no column is dropped or renamed.
-- To undo: alter table captures drop column kind, drop column display_title, drop column user_priority;
alter table captures
  add column kind text not null default 'todo' check (kind in ('todo', 'note', 'reminder')),
  add column display_title text check (display_title is null or char_length(btrim(display_title)) between 1 and 160),
  add column user_priority text check (user_priority is null or user_priority in ('high', 'normal', 'low'));
comment on column captures.kind is 'User-selected and authoritative. Separate from organized_as, which is the outcome of an approved AI/organize action.';
comment on column captures.user_priority is 'The person''s own label. AI suggestions are stored elsewhere and never write this column.';
