# Exe — Product Decision Log

Owner-approved product decisions. Each entry names the blueprint gap it resolves (`PRODUCT-BLUEPRINT.md` §9) and what it changes. `V1-LOCKED-SPEC.md` is not edited; entries here are the approved amendments until the owner chooses to fold them into the spec.

## DEC-001 — Folders, starting data and "All notes" (2026-11-08)
**Resolves:** P-02, P-03, P-23 (partly P-10, P-16). **Amends:** spec wording "preserve the five original Altr workstreams" [S§0, S§3 Map, S§5].

1. **Folders.** The existing Workstream entity is presented to users as a **Folder**. Users can create, rename and delete folders (e.g. Home, Work, Family Reunion). No ninth entity is added.
2. **Filing.** Captures, tasks, outcomes, decisions and ideas can all be filed into a folder.
3. **All notes.** One view shows everything across all folders plus anything not yet filed.
4. **Inbox.** New captures start unfiled. The user files them, or AI Review suggests a folder that the user approves.
5. **Sample data.** *(Amended 2026-11-08, see DEC-002.)* Regular users start with a completely empty app: no example folders or captures. The Altr folders and the 18 original captures are the owner's own test data and are not shown to regular users. No "Remove example data" action is needed for regular users.
6. **Deleting a folder.** Never silent. A folder that contains items asks whether to move them to another folder or to All notes first.

**Closed by DEC-002:** the earlier open points (example captures starting "pending", links to removed example records) no longer apply, because regular users never see example data.

## DEC-002 — AI Review rules and empty start for regular users (2026-11-08)
**Resolves:** P-08. **Amends:** DEC-001 item 5. **Source:** owner approval in chat. Rules 1–3 and 6 follow EXE_MASTER_PRODUCT_AND_BUILD_SPEC §7.2, §7.3, §7.5, §7.7; rules 4–5 are owner-approved recommendations not stated in that document.

1. **Defer** means "not now": the item leaves the review queue; the capture and the recommendation are kept and can be found again. No timer.
2. **Reject** exists: the suggestion is not applied, the capture is untouched, and the rejection is recorded so the same suggestion is not repeated.
3. **Merge duplicates:** proposed only, with both originals visible and a preview. After approval, neither original is deleted, both are traced to the result, and the merge can be undone.
4. **One capture, several items:** allowed only with the user's approval; the original capture stays whole.
5. **"Unsorted work":** never created silently. If no outcome fits, the app asks: create one, pick an existing one, or leave the task loose.
6. A suggestion may also be "just a note" (kept as a note, not a task).
7. **Regular users start empty.** The Altr folders and 18 captures are the owner's test data only.

## DEC-003 — Delegated product decisions (2026-11-08)
**Resolves:** P-01, P-04, P-05, P-06, P-07, P-09, P-10, P-11, P-12, P-13, P-14, P-15, P-16, P-17, P-18, P-19, P-20, P-21, P-22, P-24; D-04, D-05, D-06, D-07, D-09, D-10, D-11, D-12; T-01, T-02. **Source:** the owner delegated these decisions ("make the smartest decisions with the strongest rationale") on 2026-11-08. Each is a recommendation made by Claude, not a statement from the owner; the owner may overrule any line and the log will be amended. Where a line follows EXE_MASTER_PRODUCT_AND_BUILD_SPEC it cites the section; anything else is an inference.

**Guiding principle (spec §1.4):** Exe wins by reducing the effort between intention and progress. Where two options are close, choose the one with fewer approvals, fewer screens, and no silent AI changes.

### Product scope
- **P-01 Target user:** one individual with many parallel projects (founder/operator). Personal, not team. *Why:* spec §1.3; every team feature (sharing, roles) multiplies scope and delays shipping.
- **P-20 Accounts:** one private workspace per user, no sharing in V1; the name comes from the user, not "Altr Workspace". *Why:* spec §1.3, §15.4; simplest secure data model (every row has one owner).

### Priority Engine (P-07)
Suggestion-only; never moves lanes by itself (spec §10). Rule order, first rule that separates two outcomes wins, and the winning rule is shown in plain words:
1. Outcomes the user pinned.
2. Not blocked by a user-confirmed blocker.
3. Earliest user-entered deadline.
4. Unlocks the most confirmed dependent work.
5. Has a ready next task.
6. Most recently worked on.
- Optional fields added to Outcome/Task: `deadline` and `effort` (both user-entered, labeled estimate; shown only when set). "Objective relevance" is dropped: no user-entered objectives exist, and inferring them would be invented data.
- Runs only on meaningful events (task done, decision resolved, deadline added, blocker confirmed/cleared) and on a user "Review priorities" action, never on each capture (spec §14.1).
- Shown as a quiet card: what would change, why, Apply / Ignore / Defer. Ignored suggestions are not repeated until the underlying facts change.
- *Why:* a fixed, inspectable order is explainable and testable; a numeric score or AI ranking would be unexplainable and contradicts spec §10.3. Deadlines before "unlocks" because a real date is the strongest verified signal.

### Capture → work and dependencies (P-04, P-06)
- A Capture links to structured work through an explicit link created only when the user approves an AI Review suggestion or links it manually. The hard-coded two-item map is removed.
- The **Relationship** entity is the single authority for dependencies (`blocks`, `informs`, `related`). A separate `Task.blockedBy` is not kept; existing values migrate into Relationships.
- A `blocks` Relationship counts only when the user confirmed it. AI-suggested links display as suggestions. An outcome-level block marks that outcome blocked (red, verified only); it does not hide its tasks. Self-blocks and cycles are rejected.
- *Why:* one source of truth prevents contradictory blocked states; spec §3.4, §8.3, §16.1.

### Outcomes and lanes (P-05, P-11)
- An outcome is done only when the user confirms its definition of done; finishing all tasks only prompts that question. Completing it frees its Now slot and the app *suggests* a replacement, never auto-fills (spec §12.4).
- Outcomes with no tasks show "Not measured", not 0% (spec §8.5).
- Zero to three Now outcomes. Zero is valid and shows an empty state to choose work (spec §10.4, §11.3). A blocked outcome keeps its slot and counts toward the cap; a completed or archived one does not. Swaps may target Next or Later.
- *Why:* never inventing progress is a stated principle (spec §1.4.8).

### Focus screen (P-12, P-13, P-14, D-05, D-10, D-11)
- **Next/Later access:** a labeled "Next & Later" row at the bottom of Focus opening a separate full screen (restores R-01). Lane changes stay available from Map. *Why:* spec asks for a separate, uncluttered interface (§11.1).
- **Status line:** "1 current focus of up to 3 active. N awaiting AI Review. K blocked", omitting any part that is zero; "blocked" counts only user-confirmed blocks.
- **Inbox badge:** counts items awaiting AI Review (the number the AI Review tab opens to). The "blocked" badge is removed. *Why:* a badge should match the destination it opens.
- Redundant desktop preview columns are removed; Focus does not repeat Next/Later.

### AI Review, decisions, ideas, search (P-09, P-10, P-21, P-24, D-06)
- Reject exists (D-06 resolved in favor of spec §7.3). See DEC-002.
- Decisions: add a separate Evidence field and a chosen-option field, a dated decision log, and let users create/edit options and decisions directly (spec §9.3–9.4). Resolving a decision only *suggests* downstream changes.
- Ideas: can be edited, archived, or promoted to an Outcome through the same approval flow; no automatic promotion.
- Search covers captures (including archived, labeled), tasks, outcomes, decisions, ideas, folders. Newest and best text match first; no AI semantic matching in V1.
- Tasks can be renamed, archived, reordered, and moved between outcomes.

### Inbox, capture, data (P-15, P-16, P-22, D-07)
- Inbox sort: newest first for All/Active; most recently completed first for Done (spec §6.3). Nothing auto-archives or auto-deletes.
- Quick Capture: a list of separate lines becomes one capture per line; a paragraph stays one capture (spec §5.4). A draft is preserved if the sheet is closed.
- Retention: archive is the normal action; hard delete requires explicit confirmation; AI can never delete. Undo window for approved AI changes: until the user dismisses it, kept in history.
- Audit/undo history is stored as supporting records, not a ninth entity (spec §7.7, §16.2). *D-07 resolved.*

### Sync, AI policy, review ritual (P-17, P-18, P-19)
- Conflicts: never silently overwrite priority or decision changes; the app shows both versions and asks. Captures keep both versions. Unsynced items show "Saved on this device, not synced" (spec §5.4, §15.4).
- AI: calls run only on the server; credentials never reach the browser. Capture text is sent to the AI provider only for review the user turned on, with a plain disclosure; deep research and sensitive content need per-run approval (spec §13.3). Provider and cost caps are chosen at Phase 2 once pricing is verified. If AI is unavailable, everything works manually.
- Review ritual: an optional weekly "Review" prompt that the user can ignore; no mandatory cadence (spec §14.3).

### Visual and naming (D-04, D-09, D-12)
- Light theme only; the dark alternate is removed (AGENTS.md, spec §15.2).
- The nav label is "Map" everywhere; the home heading stays "Mission Status".
- Example/seed data never appears to regular users (DEC-002), which removes D-12.

### Technology (T-01, T-02) — inference
- Keep the current vanilla build through Phase 1b so it can be verified. From Phase 2, build on **React + TypeScript + Vite** with **Supabase** (Postgres, auth, row-level security), ported screen by screen behind the existing tests. *Why:* Phase 2 needs server-enforced rules (three-Now cap, one current focus, confirmed blockers only), and typed code plus database constraints make those checkable; Vite avoids server-rendering complexity for a signed-in app. Not yet verified against the current code size; revisit at Phase 2 kickoff.

### Not decided here (needs the owner)
- **D-01 mobile nav / D-02 / D-03 visual precedence.** AGENTS.md and both specs require five labeled tabs plus a separate floating "+". The owner's earlier direction (icon-only dock, "+" inside the dock) conflicts. This changes the look, so it needs the owner's explicit choice. Recommendation: five labeled tabs and a separate "+" (labels are readable, and AI Review stays reachable at 320–430px).
