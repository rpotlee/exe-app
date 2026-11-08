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

## DEC-004 — Master spec governs; navigation resolved (2026-11-08)
**Resolves:** D-01, D-02, D-03 (and closes the "Not decided here" item in DEC-003). **Source:** owner statement in chat that EXE_MASTER_PRODUCT_AND_BUILD_SPEC is the authoritative description of the app and earlier specs are outdated.

1. **Precedence.** EXE_MASTER_PRODUCT_AND_BUILD_SPEC.md (v1.0, 2026-11-08) is the governing product spec. Where V1-LOCKED-SPEC.md, the owner crops or earlier notes differ, the master spec wins. V1-LOCKED-SPEC.md is not edited; this log records the override.
2. **Navigation.** Five labeled destinations (Focus, Inbox, AI Review, Map, Decisions) on desktop sidebar and mobile dock, plus a separate elevated cobalt "+" for Quick Capture that does not obscure the center tab [master §2.3, §4.2, §19.3]. The icon-only dock with "+" inside is retired.
3. **Visual.** Near-white canvas, hairline borders, cobalt accent, frosted dock starting from rgba(255,255,255,.82) with blur(18px) and an opaque fallback; no dark theme [master §15.2, §19.1, §19.4]. The approved reference images stay authoritative for exact tokens.
4. **Process rules unchanged.** The master spec itself says repo process documents win for existing implementation detail [master header]; AGENTS.md process rules still apply: feature branch, tests, real screenshots, a PR per phase, no push or merge or deploy without owner approval.
5. **Phase plan.** The master spec's Phases 0–5 (§24) are the roadmap. Work now is Phase 1; it ends with all locked V1 behavior tests passing [master §24].

## DEC-005 — Phase 2 technical direction and AI model (2026-11-08)
**Resolves:** T-01, T-02 (refines the inference in DEC-003); settles who pays for AI. **Source:** the owner delegated these decisions on 2026-11-08 and stated that the owner will spend nothing on AI. Each line is a recommendation made by Claude, not a statement from the owner; the owner may overrule any line and the log will be amended. Nothing here is built yet. Anything not in the master spec is an inference.

**Guiding principle:** the rules that protect the user (three Now, confirmed blockers only, AI never changes work silently) must hold even if a screen has a bug or a model misbehaves, so they live in the database and the server, not only in the interface.

### AI is bring-your-own-key (supersedes any plan for the app to supply or pay for a model)
- **Users connect their own AI provider, key and model in Settings and pay the provider directly.** The app has no AI bill. *Why:* the owner will not fund AI; this also keeps cost and provider choice with the person whose captures are being sent.
- **The AI layer is provider-agnostic:** one internal interface with a small adapter per provider. **No model name is hard-coded** (the user picks or types the model). **Providers supported first: Anthropic, OpenAI and Google Gemini** (owner decision, 2026-11-08; one adapter each). Adding another later is one new adapter. *Why:* providers and models change quickly; an adapter is cheap to add, a hard-coded model is not.
- **User keys are stored encrypted on the server only and never reach the browser** (DEC-003 P-18). AI calls run in server functions. *Why:* a key in the browser can be copied by any script on the page. **This still requires a backend**, so AI cannot ship before Phase 2.
- **Model output is validated against a strict schema** (master §7.6, §16.5). Invalid output is dropped and the user falls back to manual organizing. Every valid result is stored as a **proposal** that needs approval; AI can never delete or complete anything.
- **Before the first AI call, show a plain disclosure** that capture text goes to the provider the user chose, and what is sent (master §13.3). No call is made until the user has seen it and agreed.
- **The app must work fully without AI** (master §1.3, §22). A user who never adds a key loses no feature except suggestions. The prototype's AI Review keyword rules stay labeled as a simulation until real AI exists.

### Order of work
- **Finish Phase 1 on the prototype first.** Feature work does not pause for the backend. *Why:* Phase 1 is how the product behavior is verified with the owner; changing storage at the same time would hide which change broke what.
- **The schema is the first Phase 2 deliverable, before any screen is ported.** It covers the eight entities (Capture, Workstream/Folder, Outcome, Task, Decision, Idea, Relationship, FocusAssignment) plus supporting tables for AI proposals, audit/undo history and idempotency keys (master §16.2; none is a ninth user-facing entity), and encrypted per-user provider settings. Every row has an owner, created/updated timestamps and a revision number. *Why:* screens are only a view of the schema; getting it reviewed first is the cheapest place to find a mistake.
- **Sync and the offline queue come after the port**, built on idempotency keys and revision checks. When two versions conflict the user is shown both; nothing is overwritten silently (DEC-003 P-17). *Why:* sync is only correct if the storage rules under it are already enforced.

### Backend and stack
- **Backend is Supabase:** Postgres, Auth, row-level security (every row visible only to its owner). *Why:* one service gives the database, sign-in and per-user isolation that master §15.4 and §21.2 require, without writing a server first. **Verify the current free-tier limits before relying on them**; this was not checked here and pricing or limits may have changed.
- **Stack is React + TypeScript + Vite**, with TypeScript types generated from the database schema, so a screen cannot disagree with the schema. *Why:* typed code catches a wrong field at build time; Vite avoids server rendering, which a signed-in app does not need.
- **The Priority Engine and progress calculations stay pure functions** (data in, result out, no storage access), so they move to the new storage unchanged and keep their tests. The prototype's engine in `app.js` is written this way on purpose.

### Rules enforced in the database (master §16.6)
- At most **three** Now outcomes per user, enforced in a transaction.
- Exactly **one current focus**, and it must be a Now outcome.
- **No dependency cycles** and no self-blocks among `blocks` relationships.
- **Only confirmed `blocks`** relationships count as blocking; an unconfirmed (suggested) one never does.
- **AI can never delete or complete anything.** AI-originated writes can only create proposals; completing a task, resolving a decision, deleting, moving a lane and confirming a blocker require a user-authorized write. *Why:* this makes "AI suggests, user decides" (master §2.4) impossible to bypass from a bug or a bad model response.

### Decided by the owner
- **AI providers to support first: Anthropic, OpenAI, Google Gemini.** Each adapter must verify against that provider's current API before it is built; nothing was checked here.

### Research uses the AI provider's own web search (delegated recommendation)
- **Research (Quick Answer, Guided Research, master §13) runs through the user's AI provider with that provider's built-in web search tool turned on**, using the user's own key. No separate search service is planned. *Why:* a model without a search tool can only answer from memory, which produces invented sources; with the tool, the AI fetches and cites real pages, and the user already pays the provider directly.
- **Fallback:** a separate search service is added only if a supported provider has no usable search tool. Research is offered only for providers that have one; otherwise the app says so honestly and everything else keeps working.
- **Citations are checked, not trusted:** every claim must carry a real source URL and retrieval date from the tool's results, and the app drops or flags any answer that lacks them (master §13.5, §13.9).
- **Before Phase 4, verify** what Anthropic, OpenAI and Gemini each offer for web search and how it is billed. Nothing was checked here.

### Still open (needs the owner)
- Nothing blocking. The Phase 4 search question depends on the verification above.

## DEC-006 — Remaining Phase 1 decisions, made by Claude (2026-11-08)
**Source:** the owner repeated that Claude should make decisions and record the reasoning rather than ask. Each line is a delegated recommendation the owner can overrule; the log will be amended. Items marked *built* are in the prototype.

- **Quick Capture segmentation (master §5.4) — built.** A pasted block is a to-do list, one capture per line, when it has two or more non-empty lines and either every line is 100 characters or shorter or any line starts with a list marker (`-`, `*`, `•`, `1.`, `1)`). Otherwise it stays one capture with its line breaks. List captures share a batch id and keep the original block, so the split is reversible. *Why:* the spec needs a deterministic rule that never discards lines; short lines are almost always a list, long wrapped lines are almost always one thought.
- **Inbox order (DEC-003 P-15) — built.** Newest first; in Done, most recently completed first. Seed captures carry no real dates, so their order follows the order they were stored.
- **Light theme only (DEC-003 D-04) — built.** The app always loads light and ignores `?theme=dark` and any saved dark choice. The unused dark CSS stays for now and is removed in a later cleanup so this change cannot alter the light look. *Why:* removing a few hundred lines of CSS and the visual diff risk can be done separately.
- **"Blocked" in the state line.** Keep one combined number (blocked tasks plus blocked outcomes). *Why:* it is the simplest honest count and the owner has not asked for a split.
- **Empty first run (DEC-002) and Folders (DEC-001) ship together — built.** The owner's Altr data stays available at `?example=1`; a normal visit starts empty. *Why:* an empty app is a dead end unless users can create folders and outcomes, so the two cannot be built apart. Folders keep the existing Workstream entity (no ninth entity).
- **AI Review actions (DEC-002) — built (as simulation).** Reject, defer-with-memory, merge preview and undo are built on the prototype as clearly labeled simulation, because they need stored proposal records that the folder slice also touches. Real AI waits for the backend (DEC-005).
- **Review route.** Phase 1b goes to the owner as a draft pull request with real screenshots; it is not merged without the owner. *Why:* AGENTS.md requires a PR per phase and owner review of visual changes, and a draft PR is that review.
- **Real iPhone Safari.** Claude cannot run a physical device. The check stays on the release list and is done by a person with the PR branch served over the local network; nothing is deployed for it without the owner's approval.

## DEC-007 — Mobile dock is dark graphite again (2026-11-08)
**Source:** owner statement in chat ("go back to black"). This is an owner decision, not a Claude recommendation. **Amends:** DEC-004 item 3 (frosted white dock) for the dock colour only.

- The mobile dock is dark graphite again. It keeps the DEC-004 structure: five **labeled** tabs and a **separate** cobalt "+" above the dock's right end. The icon-only dock and the "+" inside the dock stay retired.
- Active tab = lighter cobalt (`#9fb3ff`) so it reads on the dark bar; inactive labels are white at about 72% for contrast.
- Everything else in DEC-004 (canvas, borders, accent, no dark theme) is unchanged.

## DEC-008 — Database design choices (2026-11-08)
**Source:** delegated to Claude; recommendations the owner can overrule. Implements DEC-005. Built and tested in `supabase/`.

- **IDs are database UUIDs** instead of the prototype's text ids; the importer maps old ids to new ones and keeps a link back. *Why:* UUIDs are safe to create offline and cannot collide across devices.
- **One private workspace per user; no workspace table.** Every row has `owner_id`; every foreign key includes the owner, so one user's row can never point at another's. *Why:* DEC-003 P-20; simplest model that row-level security can fully protect.
- **The current focus is one column on the user's settings row**, not a flag on many rows. *Why:* "exactly one" is then true by construction; a trigger makes it a Now outcome and clears it when the outcome leaves Now.
- **"AI cannot delete or complete" is a database role, not a promise.** Server-side AI uses a role that can read the owner's rows and add pending proposals and nothing more. A suggested relationship can never be saved as confirmed. *Why:* the guarantee holds even if the AI code or a model response is wrong.
- **Relationships are one table covering outcomes, tasks and decisions**, with the cycle and self-block checks in the database.
- **The original capture text is immutable**; edits are stored beside it. The audit history and decision log are append-only.
- **Deleting a folder or outcome never deletes the work inside it**; items become unfiled or loose, matching DEC-001 and DEC-002.
- **Writes are guarded by revision numbers** (`update … where revision = <known>`); a stale write matches nothing and the app shows the conflict (DEC-003 P-17).
- **TypeScript types are generated from the migrations**, and a test fails if they drift (DEC-005).
- **The AI key is stored encrypted by a server function and the browser role cannot read it.** Only Anthropic, OpenAI and Gemini are allowed as providers (owner decision); the model name is a free-text field the user fills in.
- **Testing without Docker:** the schema is verified in an in-process Postgres (PGlite) with the same roles Supabase has. Run it against a real Supabase project before relying on it.

