-- Decision comparison: what the user thinks is good and bad about each option, and the criteria they care about.
-- (Plain text the person writes. No scores are computed or invented.)
alter table decision_options add column if not exists pros text not null default '' check (char_length(pros) <= 2000);
alter table decision_options add column if not exists cons text not null default '' check (char_length(cons) <= 2000);
alter table decisions add column if not exists criteria text not null default '' check (char_length(criteria) <= 2000);
-- One capture can become several items, only with the user's approval; the capture is then marked 'Split'.
alter table captures drop constraint if exists captures_organized_as_check;
alter table captures add constraint captures_organized_as_check check (organized_as in ('Task', 'Outcome', 'Decision', 'Idea', 'Note', 'Merged', 'Split'));
