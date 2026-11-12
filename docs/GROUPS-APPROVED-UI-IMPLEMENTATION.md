# Groups approved UI implementation

The Groups overview follows the supplied mobile reference: green Exe mark and New group action, title and exact subtitle, blue completion ring, Missed/Upcoming tiles, white progress cards, a permanent Ungrouped card, four-tab floating dock, and separate green capture button. The existing group projection, AI proposal persistence, approval command, and group detail route remain in use. No migration, provider call, or new service was added for this UI update.

`src/domain/groupsOverview.ts` calculates the overall percentage from unique completable entries. `missionGroups` now places loose tasks in Ungrouped and excludes captures already represented by tasks. Missed/Upcoming use actual task/outcome deadlines and active reminders in the selected folder scope; date-only deadlines expire after the local calendar day, reminders use their exact timestamp, and Upcoming covers seven days. The tiles expand to show their underlying items.

Manual creation uses the existing Outcome command through a Groups-specific `New group` dialog. Group detail retains AI dependency suggestions and now exposes the existing edit/add-task dialogs for approved groups.

## Visual review

- [Populated mobile view](../artifacts/groups-ui/groups-mobile-populated.jpg), 402×874 CSS px. Seed data is local to an isolated browser test session; the displayed 56% equals 28 completed of 50, with 22 remaining. Card percentages are independently calculated from their entries. The reference's illustrative counts were not copied.
- [Empty mobile view](../artifacts/groups-ui/groups-mobile-empty.jpg), 402×874 CSS px. Ungrouped remains present with zero progress.

The rendered mobile view was compared with the reference. The header, card order and proportions, colors, progress ring and bars, action hierarchy, and floating controls were adjusted. The reference includes native iOS status and home-indicator chrome, which a browser viewport screenshot does not include. Desktop was checked at 1280×800; cards form two columns and do not overflow. The 320 px mobile view has no horizontal overflow and scrolls to lower cards.

## Verification

`npm run typecheck`, `npm run test:unit` (240 passed), `npm run test:db` (27 passed), `npm run build`, and `git diff --check` passed. The new tests cover progress deduplication, deadline/reminder boundaries, and Ungrouped loose tasks. Browser checks confirmed New group opens the Groups-specific dialog, a Missed tile reveals three actual entries, and the 402 px/320 px layouts have no horizontal overflow. A signed-in cross-device visual check was not run; the browser screenshots use isolated local storage.
