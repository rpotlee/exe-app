# Approved Groups overview implementation

The supplied mobile screenshot is the visual source of truth for Groups. Keep `missionGroups`, approved Outcomes/Tasks, `groupCaptures`, saved AI graph proposals, and existing group detail interactions as the single data path.

1. Add deterministic selectors for group and overall completion. Count each visible completable task or pending to-do once, including loose tasks in Ungrouped. Show zero when a group has no completable entries.
2. Derive Missed and Upcoming from actual task/outcome date-only deadlines and active capture reminders in the current folder scope. A date-only deadline remains upcoming through its local calendar day; reminders use their exact time. Upcoming means the next seven days. Deduplicate an organized capture and its task.
3. Replace only the Groups overview markup with the approved title/subtitle, New group action, overall ring, summary tiles, and progress cards. Reuse the existing mobile header and group detail route. Scope light-theme and dock styling to the Groups destination so List, Activity, Folders, and Focus retain their design.
4. Reuse the existing `addOutcome` dialog for manual group creation with Groups wording. No database migration or new AI call is needed.
5. Test calculation boundaries, manual group precedence, and the create action. Run typecheck, unit/database suites, build, and compare 390 px mobile renders against the screenshot. Save review screenshots in `artifacts/groups-ui/`.

Risk: the screenshot illustrates four populated groups. Exe must render the real workspace, so an empty account shows an empty Ungrouped card and zero summaries rather than sample values.
