# Requirements matrix (Phase 1b)

Spec section → current code → gap → table/API (Phase 2 target, see DEC-005) → test → phase.
Governing spec: `EXE_MASTER_PRODUCT_AND_BUILD_SPEC.md` (DEC-004). Written 2026-11-08 against branch `feat/phase-1b-mockup-fidelity`.

**Status words.** *Built* = works in the localStorage prototype and has a test. *Partial* = some of it works. *Simulated* = looks like the feature but is a local rule, not the real thing. *Not built* = absent. Nothing here is a deployed or AI-backed application; there is no backend, sign-in or sync.

Tests: `P1` = `tests/phase1.py`, `P1b` = `tests/phase1b.py`, `A11Y` = `tests/accessibility*.py` (axe), `CC` = `tests/capture_context.py`, `DS` = `tests/design_system.py`, `RF` = `tests/refinement.py`, `BL` = `tests/baseline.py`. All run 320–1440 px unless noted.

| Spec § | Current code (`app.js` unless noted) | Status | Gap | Phase 2 table / API | Test | Phase |
|---|---|---|---|---|---|---|
| §2.1 eight entities | Arrays in `data`: captures, workstreams, outcomes, tasks, decisions, ideas, relationships, focusAssignments. IDs preserved by `migrate()`. | Built | Ideas are display-only (no create/edit). FocusAssignment has no own ID/order field. | `captures, workstreams, outcomes, tasks, decisions, ideas, relationships, focus_assignments` (owner, timestamps, revision) | BL, P1 | 1 / 2 |
| §2.3, §4.1, §4.2, §19.3 navigation | Five labeled tabs on sidebar and dock; separate cobalt "+" above the dock's right end (`index.html`, `exe-ui.css`). | Built | Search/Settings reachable on phones only through the avatar menu (not covered by a test); no router/back-button behaviour (§4.4). | — | P1b, P1, DS, RF | 1 |
| §4.3 shared UI states | Static "Saved on this device" label. Empty states for lanes/decisions. | Not built | Loading, unsynced, offline, error, conflict states. | `sync_mutations`; client queue | — | 2 |
| §5 Quick Capture | Sheet, focus trap, returns to prior route and Focus Mode (`showCapture`); `segmentCapture` keeps a paragraph as one capture and splits a list (DEC-006), with batch id and original block. | Partial | No idempotency key, offline queue or kept draft. | `captures` + `idempotency_keys` | CC, P1b | 1 / 2 |
| §6 Inbox | Raw checklist, All/Active/Done, inline add, edit (original kept), archive/restore, independent completion. | Partial | Order is newest first, Done by latest completed (DEC-003). "View linked work" and review-request menu items missing. | `captures.completed_at, archived_at, edited_text` | P1, RF | 1 |
| §6.4 completion independence | Checking a capture sets only `completedAt`. | Built | — | trigger-free: no cascade | P1 | 1 |
| §7 AI Review | `propose()` keyword rules, labeled a simulation. Actions (DEC-002): Approve, **Not now** (kept under Set aside), **Reject** (same suggestion not repeated), **merge preview** of look-alike captures (both kept and linked), **Undo** while the result is untouched, **ask where a step goes** (new outcome / existing / loose), **just a note**. | **Simulated** | No real AI. Not built: one capture split into several items, selective batch approve with preview, edit-then-approve beyond type/folder. | `ai_proposals`, `audit_events`, `user_ai_settings` (encrypted key, server only) | `tests/phase1d.py` | 1 (simulation) / 2 (real) |
| §7.7 proposal status/audit | `data.audit` records priority applies, outcome completions, folder deletes and approval undos; captures carry approved / set-aside / rejected state. | Partial | Proposal states, actor, source version. | `ai_proposals.status`, `audit_events` | P1b (audit entry) | 2 |
| §8.1–8.2 Map | Workstream → outcomes → steps; mobile list/detail; per-outcome Now/Next/Later actions. | Built | Related captures, ideas and decisions are not shown per outcome. | — | P1, P1b | 1 |
| §8.3 relationships | Add / confirm / remove (`relationshipError`, `reachesByBlocks`); kinds `blocks / informs / related`; unconfirmed shown as "Suggestion" and ignored for blocking; self-block and cycles rejected. `Task.blockedBy` and `CAPTURE_TASKS` removed (migrated). | Built | Direction shown in words, not an arrow; no AI-created suggestions yet. | `relationships` with DB cycle check and `confirmed` flag | P1b | 1 / 2 |
| §8.4 task actions | Add step, check/uncheck, rename, move to another outcome, reorder, archive/restore. | Partial | No step notes, per-step deadline/effort UI (fields allowed on the model, UI only on outcomes). | `tasks.notes, deadline, effort, archived_at` | P1b | 1 |
| §8.5 progress | `progress()`/`laneProgress()` from real checked steps; archived steps excluded; no steps → "Not measured". | Built | — | pure function, unchanged | P1b, A11Y | 1 |
| §8.4 / DEC-003 outcome completion | Done only after user confirms the definition of done; prompted when all steps are done and on leaving Focus Mode; frees the Now slot, never auto-fills; reopen goes to Later. | Built | Definition of done is the outcome description (no separate field). | `outcomes.done_at`; Now-cap trigger | P1b | 1 |
| §9 Decisions | Create/edit decisions and options, Evidence (separate from notes), chosen option, rationale, dated log, reopen; resolving only *suggests* follow-up for items it blocks. | Built | Sorting by verified impact, linked outcome display, comparison criteria, unknowns, research findings. | `decisions` (+ `decision_options`, `decision_log`) | P1b | 1 / 3 |
| §10 Priority Engine (typed port) | `src/domain/engine.ts`, `blocking.ts`, `progress.ts`, `capture.ts`, `status.ts`: the same rules as pure TypeScript with 20 unit tests; not yet wired to a screen. | Partial | UI port pending. | same pure functions | `npm run test:unit` | 2 |
| §10 Priority Engine | `compareFacts`, `rankOutcomes`, `computeSuggestion` — pure, rule order from DEC-003, explanation text, no scores. Card with Apply (confirm with before/after) / Ignore (fingerprint) / Defer. Runs on task done, decision resolve/reopen, deadline/pin, relationship change, and "Review priorities"; never on capture. | Built | Effort is stored but not a rule (per DEC-003). Immediate-action ("I have 20 minutes", §10.5) not built. Pins/deadlines are entered on Map. | `priority_recommendations`; same pure functions | P1b, A11Y | 1 / 2 |
| §10.4 / §16.6 Now cap | UI refuses a 4th Now (swap dialog); engine Apply checks the result ≤ 3. | Partial | Client-side only. | DB constraint/transaction: ≤3 Now, one current focus | P1, P1b | 1 (UI) / 2 (DB) |
| §11 Focus / Mission Status | Heading, state line (`statusLine`), one current priority + other active priorities, Priority suggestion card, Next & Later row opening its own screen. | Built | Red blocked state on the current-priority card; "Why this?"; "Suggested next action". Blocked tasks do show a Blocked pill in checklists. | — | P1b, DS | 1 |
| §11 state line / badges (DEC-003) | "1 current focus of up to 3 active. N awaiting AI Review. K blocked", zero parts omitted; K = unfinished blocked tasks + outcomes held by confirmed blocks. Inbox and AI Review badges = items awaiting AI Review. | Built | — | — | P1b | 1 |
| §12 Focus Mode | Overlay with checklist, capture returns to it, Escape/focus trap. | Partial | Step-breakdown suggestions, blocked-state unblock options, "Why this action?". | — | CC, P1 | 1 / 3 |
| §13 Research | — | Not built | Everything (Quick Answer, Guided Research, citations, permissions, quotas). User-supplied provider/key (DEC-005); provider and search choice still open. | `research_runs`, `research_findings`, `research_sources` | — | 4 |
| §14 adaptation | Engine triggers on meaningful events; card is the contextual prompt. | Partial | Weekly review, "this decision is resolved; two tasks may be actionable" prompt on Focus (only on the Decisions screen). | `events` | P1b | 3 |
| §15.1 search | Outcomes, tasks, decisions, original captures (incl. archived). | Partial | Ideas, folders, research findings; best-match ordering. | Postgres full-text | P1 | 2 |
| §15.2–15.3 settings / backup | JSON export/import with version and shape check; imports run through `migrate()`; reset example. | Partial | Restore preview with counts and conflicts, size limits, rollback. No account, research or privacy settings. | `/workspace/export, import-preview, import-commit` | P1 | 2 |
| §15.4 auth / sync | — | Not built | Auth, per-user storage, sync, conflict screen, offline queue (DEC-005 order: after the port). | Supabase Auth + RLS; `sync_mutations` | — | 2 |
| §16.6 DB invariants | Prototype: client-side checks. **Phase 2 schema (not yet connected to the app):** Now cap, one current focus, no cycles/self-blocks, confirmed-only blocks, AI role cannot delete/complete, immutable capture text, append-only audit — all in `supabase/migrations`, 16 tests in `supabase/tests`. | Partial | The app does not use the database yet; not tested on a real Supabase project. | constraints, triggers, RLS (built) | `npm run test:db` | 2 |
| §17 API | — | Not built | No backend. | `/captures`, `/ai-review/...`, `/focus/assignments`, `/priority/recommendations`, … | — | 2 |
| §19 design system | Tokens in `exe-ui.css`; light default; dark graphite labeled dock (DEC-007). | Built | App always loads light; the unused dark CSS is still in `exe-ui.css` (cleanup planned, DEC-006). | — | DS, A11Y, RF | 1 |
| §19.4 / §23.4 devices | Checked headless Chromium at 320/375/390/430/768/1024/1280/1440. | Partial | Not tested on real iOS Safari or with a real virtual keyboard; Chromium only. | — | P1, P1b, RF | 1 (open) |
| DEC-001 folders | Workstream is shown as **Folder**: create, rename, delete (never silent: items move to a chosen folder or All notes), file captures, outcomes and decisions, **All notes** view, loose steps. | Built | Ideas cannot be created or filed from the UI; tasks inherit their outcome's folder. | `workstreams` (as folders), `captures.folder_id` | `tests/phase1c.py` | 1 |
| DEC-002 empty start | A normal visit starts empty with no Altr text; the owner's data loads only from `?example=1` into an empty workspace; workspace name is user-entered; no silent "Unsorted work". | Built | AI Review reject/defer/merge/undo and the ask-before-creating-an-outcome prompt are still to build (simulation). | — | `tests/phase1c.py` | 1 |

## Open items that need the owner
- Phase 4 research is planned through each AI provider's own web search tool, with a separate search service only as a fallback; verify what each provider offers first (DEC-005). AI providers are decided: Anthropic, OpenAI and Google Gemini. AI is bring-your-own-key and needs the Phase 2 backend; nothing AI-related can ship on the prototype.
- Whether the "blocked" count in the state line should count tasks and outcomes separately (currently one number).
- `tests/visual_conformance.py` and `tests/visual_compare.py` were not re-run; they compare against the old icon-only dock.

## Added 2026-11-08 (DEC-013)
| Spec § | Status | Where | Test |
|---|---|---|---|
| §12.3 make a vague step actionable | Built (typed/pasted steps); AI suggestions built but not live until the updated function is published | `StepsDialog`, `parseSteps` | `tests/app_react.py`, `ai.test.ts` |
| §10.5 "I have 20 minutes" | Built | `src/domain/next.ts` `quickWin` | `next.test.ts`, `tests/app_react.py` |
| §14.1–14.2 prompts after changes | Built (3 kinds) | `prompts()` | `next.test.ts`, `tests/app_react.py` |
| §14.3 weekly review | Built (optional, real data only) | `src/domain/weekly.ts` | `next.test.ts`, `tests/app_react.py` |
| §2.1 Ideas (create, edit, archive, promote) | Built | `createIdea` … `promoteIdea` | `commands.test.ts` (real schema), `tests/app_react.py` |

## Added 2026-11-08 (DEC-014)
| Spec § | Status | Test |
|---|---|---|
| §11.2/§11.4 "Why this?" and red blocked state with an unblock action | Built | `insight.test.ts`, `tests/app_react.py` |
| §9.2 Decision queue sorted by verified impact | Built | `insight.test.ts`, `tests/app_react.py` |
| §9.3 options with criteria and side-by-side notes (no scores) | Built | `review.test.ts` (real schema), `tests/app_react.py` |
| §7.7 history / audit view | Built (Settings, History) | `insight.test.ts`, `tests/app_react.py` |
| §7.3 selective batch approve with preview | Built | `tests/app_react.py` |
| §7 / DEC-002 split one capture into several, undoable | Built | `review.test.ts` (real schema), `tests/app_react.py` |
| §13 Research (Quick Answer, Guided Research, citations) | **Not built** (see DEC-014) | none |
