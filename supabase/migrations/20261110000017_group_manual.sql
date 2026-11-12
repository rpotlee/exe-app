-- A manual placement, including an intentional move back to Ungrouped, wins over later AI matching.
-- Nullable during rollout: older deployed clients' generic write RPC sends NULL for unknown columns.
alter table tasks add column group_manual boolean default false;
