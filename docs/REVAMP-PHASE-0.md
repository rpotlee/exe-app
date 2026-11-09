# Revamp v1.0: Phase 0 report (baseline, reconciliation, migration plan)

Spec: `EXE-CLAUDE-CODE-UX-REVAMP-HANDOFF-v1.0.md` (owner, 2026-11-08). Written against `main` at caebaf4. Nothing in this report has been applied to the live database, merged or deployed.

## 1. What is running (verified)

| Fact | Evidence |
|---|---|
| The running app is the React app in `web/` (root `index.html`/`app.js` is the old prototype, not served). | `vite.config.ts` root is `web`; Netlify publishes `dist/` built from it. |
| `main` = caebaf4, auto-deploys to Netlify on push (GitHub app linked). Only open PR is #1 (stale Phase 1 prototype branch, not a base). | `gh pr list`, Netlify deploys |
| Baseline is green: typecheck clean, 250 unit tests pass (including the real-schema database command test), axe tests pass at 320–1440 px (Chromium). | run 2026-11-08 |
| Navigation today: Focus, Inbox, AI Review, Map, Decisions; floating glass dock with a capture bar above it (UI kit, DEC-015 era). The dark graphite dock (DEC-007) was already replaced by the owner-approved UI kit. | `web/app/Shell.tsx`, AGENTS.md |
| `useAssist` keeps AI help in browser storage only (device-local), keyed by a text hash. The function is deployed but has never been seen working with a real key by the builder. | `web/app/useAssist.ts`; HANDOFF |

## 2. Data model: what the spec assumes vs what exists

- **Folders already are user workspaces.** `folders` (id, owner, name, position, revision) is what users see as "Folder" (DEC-001). `folder_id` exists on `outcomes`, `captures`, `decisions`, `ideas` with `on delete set null`, so deleting a folder already preserves content as Unfiled. **Loose tasks have no folder** (spec risk 2): tasks under an outcome follow the outcome; tasks with `outcome_id = null` have no scope.
- **There is no separate Workstream table.** The "Workstream" entity in the older spec was implemented as `folders`. The spec's own lowest-risk route is to keep `folders` as workspaces and add a Workstream representation only where needed. **Proposal: do not add a workstreams table in this revamp.** The Outcome → Task hierarchy is the execution structure and nothing in the required behavior needs a third level. Revisit only if you want named sub-areas.
- **Captures have no kind.** Today every capture is a checkable raw item. `organized_as` is the AI/approval classification and must stay separate from the new user-chosen `kind`.
- **Audit exists** (`audit_events`: actor, action, entity, before/after, `undo_of`, append-only) but only some commands write to it. **AI results**: `ai_proposals` exists but the live help does not use it (stored in the browser).
- **No reminder, priority-label or assistance storage exists.**

## 3. Proposed migrations (additive; none applied)

All new columns nullable or defaulted, no drops, no renames, no backfill that changes meaning. Old app code keeps working against the new schema.

| # | Change | Reversible | Data effect |
|---|---|---|---|
| 9 | `captures.kind text not null default 'todo' check in (todo, note, reminder)`; `captures.display_title`; `captures.user_priority text check in (high, normal, low)` null = none | drop columns | **Every existing capture becomes `todo`** (the old Inbox is a to-do list). The spec says to leave ambiguous legacy entries for review; the report in §5 lists which legacy rows are not plain actionable text (captures already organized as Note/Idea). |
| 10 | `tasks.folder_id` for loose tasks (fk like the others) | drop column | none; null = Unfiled |
| 11 | `reminders` table: capture_id, due_at (utc), local_time, tz (IANA), state, snoozed_until, dismissed_at; owner-scoped RLS, revision, idempotent | drop table | none |
| 12 | `assistance` table: capture_id, content_revision, kind, status, provider/model, content jsonb, sources jsonb (verified URL + retrieved_at), fingerprint, stale; RLS | drop table | none; replaces the device-local cache |
| 13 | Audit: extend `action` vocabulary and add a minimal-payload convention; app-side change mostly | n/a | none |

Gates: each migration gets a before/after count check (rows per table, relationship count, focus count) in the test suite using the real schema in-process, and an export taken from the live app before the owner applies anything. **I will write and test these locally and stop before applying any to the live project.**

## 4. Safe implementation sequence

1. Phase 1 on `revamp/phase-1` (off `main`): domain + commands + tests for kind and scope, then Shell/nav, Executables, composer, folder drawer, route redirects. Runs fully in local mode and against the in-process database; live data is not touched.
2. Pull requests get Netlify previews that talk to the **live** database, which does not yet have migration 9. So the preview of Phase 1 will work only in local mode until migrations are approved and applied. I will say so in the PR.
3. Phases 2–4 follow the spec order. Each is a separate PR with real screenshots and the acceptance tests it names.
4. **No merge, deploy or live migration without your explicit go-ahead, per PR.**

## 5. Change-control table (older requirement → revamp)

| Older source | Revamp | Action |
|---|---|---|
| "Inbox" label, five tabs Focus/Inbox/AI Review/Map/Decisions, separate capture | Executables / Mission / center + / AI Assistant / Folders drawer | Replace shell; keep every old screen reachable (Mission → Explore work); redirect old hashes |
| Raw capture = checkable to-do | `kind` todo/note/reminder, user-chosen | Add column; keep original text immutable |
| AI Review as a tab | AI Assistant → Needs your decision | Move; keep approve/merge/undo logic unchanged |
| DEC-015 live help, device-local | Durable assistance in the database, consented, batched | Phase 3 |
| DEC-007 dark graphite dock | Superseded earlier by the UI kit (owner, 2026-11-08) | **Keep the current glass dock; see question 2** |
| "Folder" = Workstream (DEC-001) | Folder = workspace; Workstream stays internal | Keep `folders`; no new table (proposal above) |
| Three-Now cap, confirmed-only blockers, AI never mutates, BYOK server-side | Unchanged | Preserved, covered by existing tests |

## 6. Decisions I need from you (only what the spec leaves open or marks for sign-off)

1. **Priority label vocabulary and the Mission screenshot checkpoint (spec §6.4).** I will build High / Normal / Low behind the checkpoint and show you the Mission screen before the column is applied live.
2. **Dock look.** The spec says to honor the dark graphite dock "where applicable". The owner replaced it with the UI-kit glass dock the same day. I will keep the kit's look unless you say otherwise.
3. **"Executables" at 320 px.** If the label crowds, I will not change it without your approval; I will show you the screenshot.
4. **Migration 9 backfill.** Confirm that every existing capture becomes a To-do (after you have exported your data).
5. **Real iPhone Safari verification** (spec §14) is yours to run; emulation will be reported as emulation.

Everything else in the spec is treated as decided.
