-- An outcome created from approved captures remembers them (as tasks, decisions and ideas already do), so an approval can be
-- traced and undone while the outcome is untouched.
alter table outcomes add column if not exists sources uuid[] not null default '{}';
