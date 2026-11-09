-- Reminders (additive, reversible): when an entry is due, and when the person dismissed it.
-- Snoozing simply moves remind_at later. There is no push, email, SMS or calendar delivery; due reminders show inside the app.
-- To undo: alter table captures drop column remind_at, drop column remind_done_at;
alter table captures
  add column remind_at timestamptz,
  add column remind_done_at timestamptz;
create index captures_remind_idx on captures (owner_id, remind_at) where remind_at is not null and remind_done_at is null;
comment on column captures.remind_at is 'User-set. The AI never sets or changes it.';
