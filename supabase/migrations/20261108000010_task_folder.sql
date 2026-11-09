-- Revamp phase 1 (additive, reversible): a direct folder for loose steps (tasks with no outcome), so they do not vanish from folder views.
-- A task inside an outcome keeps following its outcome's folder; this column is only read when outcome_id is null. Existing rows stay Unfiled.
-- To undo: alter table tasks drop column folder_id;
alter table tasks add column folder_id uuid;
alter table tasks add foreign key (owner_id, folder_id) references folders (owner_id, id) on delete set null (folder_id);
