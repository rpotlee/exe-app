# Exe V1 — Reconstructed Product Blueprint

**Status:** reconstruction and gap analysis, written 2026-11-08. **It is not a new specification and does not replace `V1-LOCKED-SPEC.md`, which is unchanged.** Where this document states a requirement, it cites a source. Where it infers, it says so. Where sources are silent or disagree, it records a gap (§9) instead of choosing.

## 0. Document control

### 0.1 Source key

| Tag | Source | Notes |
|---|---|---|
| **[S§n]** | `V1-LOCKED-SPEC.md`, section *n* | Authoritative for function, architecture, data, acceptance gates. Unchanged by this work. |
| **[A]** | `AGENTS.md` | At the PR branch tip it is the short guardrail list. On the local branch it is the rewritten version (§0.3). |
| **[SH]** | `START-HERE.md` | Handoff and phase order. |
| **[R]** | `README.md` | Run notes; "Personal Execution System". |
| **[DR]** | `assets/design-reference/README.md` + the two approved WebP images + owner crops | Visual precedence rules. |
| **[PR]** | PR #1 documents on `origin/feat/phase-1-inbox-mobile-parity`: `docs/PHASE-1.md`, `PHASE-1-ACCEPTANCE.md`, `TEST-RESULTS.md`, `IMPLEMENTATION-ACCEPTANCE.md`, `visual-conformance/AUDIT.md`, `visual-conformance/REPORT.md`, `design-master/COMPONENT-SPEC.md` | Records what Phase 1 built and tested. |
| **[C]** | `app.js` (function names given; line numbers drift) | What the code actually does. |
| **[DA]** / **[MA]** | `DESIGN-AUDIT.md`, `MOBILE-LAYOUT-AUDIT.md` | Audits of the local branch. |
| **[I]** | Inference | Mine. Never treated as a requirement. |

### 0.2 What was and was not done

Read: all of the documents above, all of `app.js`, `index.html`, `exe-ui.css` (structure), the PR #1 description and file list, and `docs/baseline-example.json`. The two approved WebP images were opened and inspected (observations in §7.1b); the owner crops are described by [DR] and were not re-opened for this document.
**Not done:** the Python test suites (`tests/*.py`) were not run (Playwright is unavailable here). Every "passes" statement about them below is **PR #1's claim, not my verification**. No real iPhone, backend, AI service or deployment exists to inspect.

### 0.3 Repository state

| Ref | State |
|---|---|
| `main` (`f25a3cc`) | Original baseline (`index.html`, `styles.css`, `app.js`) + spec, handoff docs, approved reference images. **No Phase 1 work.** |
| PR #1 `feat/phase-1-inbox-mobile-parity` (tip `095a3e5`, **open, mergeable, no reviews, no comments**) | 8 commits: Phase 1 raw Inbox + mobile nav parity, visual conformance passes, `design-master/`, illumination/icons/nav geometry. Titled "Phase 1: approved visual implementation in the actual Exe application". Its own closing line: "Stop for final acceptance. No merge, deployment, architecture change or Phase 2." |
| local `feat/phase-1b-mockup-fidelity` (`7f9fc78`) | **Unpushed.** Branched from `05bbcab`, which is **two commits behind the PR tip** (it lacks `e9be4ae` and `095a3e5`). Adds a separate `exe-ui.css` visual system and the changes in §8.3. **It has diverged from PR #1 and will need reconciliation.** |

The blueprint's behavior statements are based on the **local branch code**, with the PR tip used to separate "Phase 1 behavior" from "changes made on the local branch" (§8.3). The two `app.js` versions differ in presentation only, apart from the items in §8.3.

---

## 1. Purpose, user problem, philosophy

**Stated:**
- Name and positioning: "Exe — Personal Execution System" [R]; "turn scattered thoughts into clear priorities" [`index.html` meta description].
- Intended outcome [S§9]: the user opens Exe on laptop or phone, sees Mission Status, goes instantly to a raw checkable Inbox, captures new thoughts globally, selectively approves intelligent organization, understands workstream/outcome/decision relationships, receives explainable priority recommendations, and acts on up to three Now priorities "without losing information or context". Every meaningful change persists securely across devices.
- Workflow [S§0]: **Capture → AI Review → Project Map/Decision Queue → explainable Priority Engine → Now/Next/Later Focus Board → Focus Mode → adapt/review.**
- Mobile-browser-first web app; desktop and mobile equivalent in capability [S§0].

**Philosophy, as written (these are the invariants):**
1. **Advisory AI.** Suggestions never silently merge, delete, reclassify, create dependencies, complete tasks or promote priorities [S§0, A].
2. **Capture never loses information.** Originals are preserved verbatim with timestamps and provenance; organizing never erases them [S§3 Inbox, S§5].
3. **Protect attention.** At most three Now priorities; one current priority; Focus Mode shows one priority and routes interruptions to Inbox [S§3, A].
4. **Explainability.** Priority logic and dependency types are visible; no synthetic scores, no fabricated dates or progress [S§3, A].
5. **Honesty.** It is a prototype, not live AI; prototype keyword rules must never be described as AI [S§3 AI Review, A].
6. **Separate dimensions.** Capture completion ≠ AI review status ≠ structured Task completion [S§0, S§5].

**Not stated anywhere (gap G-01):** a written target-user definition, the specific problems it solves, success measures, or scope limits (single user vs team). The seed data is one founder's business ("Altr"), and [S§9]/[S§6] imply a **personal workspace**. Anything about the user beyond that is my inference [I] and needs your confirmation.

---

## 2. Information architecture and navigation

**Destinations (five)** [S§2]: Focus (page title "Mission Status" [A]), Inbox, AI Review, Map (spec/page name "Project Map"), Decisions.
**Not destinations:** Focus Mode (contextual), Priority Engine (in-context), Quick Capture (global), Search, Settings/Workspace [S§2].

| Element | Spec | Notes |
|---|---|---|
| Mobile nav | Five labeled destinations on a floating glass dock; separate circular cobalt Quick Capture "slightly elevated"; must not obscure the middle destination [S§2, S§4] | See §9 D-01: owner crops and later owner direction conflict with this. |
| Desktop nav | Sidebar with the five destinations, plus a global Quick Capture control and `Cmd/Ctrl+K` [S§2] | Implemented [C]. |
| Search, Settings, JSON backup/restore | Available on **both** desktop and mobile; mobile via header/overflow/account menu [S§2] | Desktop: sidebar. Mobile: account menu from the header avatar [C `showAccountMenu`]. |
| Labels | All nav controls have text labels, active states and accessible names [S§2] | Local branch: dock labels are visually hidden (accessible name kept) by owner direction. |
| Routing | Desktop and mobile share one route/state model [S§2] | `data.page` ∈ focus/inbox/review/map/decisions [C]. **No URL routing**: pages are not addressable or linkable [C]. |

**Screen-to-screen links [C]:** header bell and the status-line button → AI Review; Inbox header button "Review N new" → AI Review; AI Review "Back to inbox"; Search results → Map/Decisions/Inbox; Focus Mode ↔ Quick Capture.

---

## 3. Entities

Eight core entities are frozen [S§0]: **Capture, Workstream, Outcome, Task, Decision, Idea, Relationship, FocusAssignment**. The persisted object is `{version:1, workstreams, outcomes, tasks, decisions, ideas, relationships, captures, focusAssignments, currentPriority, selectedStream, selectedDecision, page}` in one `localStorage` key [C `load/persist/seed`]. **View state (`page`, `selectedStream`, …) is stored inside the data blob and therefore also in backups** [C].

### 3.1 Property tables

Legend: **S** = required/named by spec · **C** = exists in code · **—** = absent.

| Entity | Properties (code) | Spec-required but absent |
|---|---|---|
| **Capture** | `id`, `text` (original, never edited), `status` `'pending'\|'organized'`, `createdAt` (ISO, or the literal string `'Imported example'` for seed), `source` (`'Altr brain dump'\|'Inbox'\|'Quick Capture'`), `proposal` `{type, stream, title, related}`, `organizedAs`, `completedAt` (nullable, **S**), `archivedAt`, `checklistText` (edited display text), `taskId` (optional link, **never set by any code path**) | Link from an approved capture to the entity it produced; audit/undo history; provenance beyond `source` [S§3 AI Review, S§5] |
| **Workstream** | `id`, `name`, `icon`, `description`. Five fixed: foundation, market, partners, technology, growth | Spec says "preserve the five"; creating/editing workstreams is unspecified |
| **Outcome** | `id`, `stream`, `name`, `description`. Created by seed, by an approved Outcome capture, or auto-created "Unsorted work" | Status/lifecycle; completion; deadline; effort; readiness (all inputs the Priority Engine is said to use [S§3]) |
| **Task** | `id`, `outcome`, `name`, `done` (bool), `blockedBy[]` (task ids) | Status beyond done; edit/delete; deadline; effort; ordering |
| **Decision** | `id`, `stream`, `name`, `status` `'open'\|'resolved'`, `description`, `options[]` (strings), `notes`, `selected` (free-text conclusion) | `evidence` (spec lists evidence separately from notes); chosen-option link; history/audit; affected-work suggestions |
| **Idea** | `id`, `stream`, `name`, `notes` | Any lifecycle or actions |
| **Relationship** | `from`, `to` (outcome / task / decision ids), `kind` `'blocks'\|'informs'\|'related'`, `description` | **`id`** (spec says preserve entity IDs; relationships have none); `confirmed`/origin flag to separate user-declared from AI-suggested [S§5, S§3 Map]; creation UI |
| **FocusAssignment** | `outcome`, `lane` `'now'\|'next'\|'later'` | Order within a lane; reason; timestamps. An outcome without a record is treated as **Later** [C `laneOf`] |

### 3.2 Relationships between entities

```
Workstream 1─* Outcome 1─* Task ──blockedBy──► Task
Workstream 1─* Decision          Workstream 1─* Idea
Outcome 1─0..1 FocusAssignment(lane)
Relationship: from/to ∈ {Outcome, Task, Decision}  (kind: blocks | informs | related)
Capture ──proposal──► (becomes) Task | Outcome | Decision | Idea   [link not stored]
Capture ··CAPTURE_TASKS map·· Task   (hard-coded for 2 seed captures; local branch only, §8.3)
```
Two dependency mechanisms coexist: **`Task.blockedBy`** (drives the Blocked badge) and the **Relationship** records (display only). Seed data duplicates one of them (`hiring-process → hiring-backend`) in both; the other `blocks` relationship (`market-select → locations`, outcome→outcome) has no matching mechanism that blocks anything [C]. See gap P-06.

### 3.3 Lifecycle states (as implemented)

| Entity | States and transitions |
|---|---|
| Capture | **Review:** `pending` → (approve) `organized`. "Keep in inbox" changes nothing. **Completion:** `completedAt` null ↔ ISO date, independent of review. **Archive:** `archivedAt` null ↔ date, reversible. Edit changes `checklistText` only. **No delete.** |
| Task | `done` false ↔ true. **Blocked** is derived: not done and any `blockedBy` task not done. Add only; no edit/delete. |
| Outcome | No own status. **Progress** derived from its tasks. Lane via FocusAssignment. |
| Decision | `open` → `resolved` (conclusion text required) → `open` (reopen; conclusion kept). Options added, never removed. |
| FocusAssignment | Lane changed by the user only. Moving to `now` when three exist opens a replacement dialog. |
| Idea / Workstream / Relationship | Static after creation. |

### 3.4 Seed data (the "Altr example") [C, `docs/baseline-example.json`]
5 workstreams, 12 outcomes, 23 tasks (none done; two with `blockedBy`), 5 decisions (all open), 2 ideas, 5 relationships, **18 captures all `status:'organized'` with `createdAt:'Imported example'`**, 12 focus assignments: **Now** = Confirm New York business registration, Determine first service area, Define Backend V1 (matches [S§5]); Next = insurance, pricing, hiring, communications, security, seo, locations; Later = reviews, thumbtack. `currentPriority` = `registration`.

---

## 4. User flows

Each flow lists the specified behavior, what the code does, and where they differ.

### 4.1 Quick Capture
- **Specified:** global, one tap from every destination and from Focus Mode; free-form multiline brain dump; each line appears in Inbox; returning to the previous context preserves state [S§2, S§3, S§7 gate 4].
- **Code:** opened by the Capture button, `Cmd/Ctrl+K`, or "Capture thought" in Focus Mode. Text is split on line breaks; blank lines dropped; **each line becomes one Capture** `{status:'pending', source:'Quick Capture', proposal:propose(text)}`. Returns to the prior page scroll, unfinished Inbox draft, expanded checklist, and Focus Mode scroll [C `showCapture`, `#capture-form`].
- **Edge cases [C]:** empty submit refocuses the field; **cancelling loses the typed text** (no draft saved); no max length on this field (the Inbox add field caps at 4,000); no de-duplication; pasted bullets/numbering are kept as typed.

### 4.2 Raw Inbox
- **Specified:** filters All/Active/Done, inline "Add a to-do…", raw rows with independent check/uncheck, strike-through/confirmation, edit/archive/undo, originals never erased, AI pending count as a quiet action not a gate, empty state, sorting, persistence, keyboard use [S§3 Inbox].
- **Code:** add → Capture `pending` `completedAt:null` `source:'Inbox'`; check → `completedAt` set/cleared with toast "To-do completed. Review and tasks unchanged."; Edit → `checklistText` (original retained and shown as "Original capture"); Archive/Restore via row menu and "View archived"; Esc closes an open row menu. Order = creation order (new at the bottom). Empty filtered view: "No to-dos in this view."
- **Differences:** "undo" exists only as Restore from the archived view, not as an immediate undo; "sorting" is undefined (§9 P-23).

### 4.3 AI Review
- **Specified:** original capture alongside editable suggested type, target workstream, possible existing outcome, duplicate/related capture proposals, dependency kind, short explanation; actions: approve, edit and approve, defer, selective batch approve; never auto-merge or modify the Focus Board; server-side schema-validated AI if deployed, otherwise manual; approval preserves the original and links it to target work; traceability and undo/audit history [S§3 AI Review].
- **Code:** lists `pending` captures. Each shows the original text, editable **type** (Task/Outcome/Decision/Idea) and **workstream**, one static explanation sentence, **Approve & organize**, **Keep in inbox**. **Approve all (N)** exists (no selective batch, no confirmation). Classification is `propose()`: keyword rules (§5.3), explicitly labeled "local rules, not a live AI model".
- **What approval does [C `accept`]:**

| Type | Effect |
|---|---|
| Task | Added to `p.related` outcome **only if** that outcome is in the same workstream; otherwise to an auto-created outcome named **"Unsorted work"** in that workstream (lane **Later**). |
| Outcome | New outcome in the workstream, lane **Later**, description "Created from an approved capture." |
| Decision | New open decision with no options. |
| Idea | New idea, notes "Approved from the Inbox." |
| All | `status:'organized'`, `organizedAs`, `proposal` stored. **Original text untouched.** The entity name is the capture text verbatim (no title edit). |

- **Not implemented:** duplicate/related-capture proposals (so the SEO overlap in gate 5 is never flagged), possible-existing-outcome selection, dependency kind, real defer state, reject, selective batch approve, audit/undo, any capture→entity link.

### 4.4 Project Map
- **Specified:** preserve the five workstreams and their content; drill-down, checklist actions, relationship visibility, task create/edit/complete; distinguish hard `blocks` from `informs`/`related`; unconfirmed AI relationships are not real blockers; mobile uses a readable list/drill-down [S§3 Map].
- **Code:** workstream picker → outcomes (with lane pill NOW/NEXT/LATER) → tasks (check, **Add step**) → lane buttons (Make active / Move to Next / Move to Later) → Relationships list (icon + description + kind) → Ideas list. Disclaimer shown: "Dependencies and relationships are suggestions unless explicitly confirmed. Checkmarks represent demo activity only."
- **Not implemented:** task edit/delete, relationship creation/confirmation/removal, outcome create/edit outside AI Review, idea actions.

### 4.5 Decisions
- **Specified:** preserve options, notes, evidence, conclusion, status; mobile shows one decision at a time; resolving **suggests affected work for review** and never moves priorities [S§3 Decisions].
- **Code:** pick a decision; add options (strings); notes autosave on input; **Mark resolved** opens "Record your decision" (conclusion required, ≤320 chars); toast "Decision recorded. Priorities unchanged."; Reopen. **No suggestion of affected work** is produced.

### 4.6 Prioritization (Now / Next / Later)
- **Specified:** explainable deterministic recommendation core (objective relevance, verified deadlines, dependency impact, readiness, effort, explicit user overrides); no 0–100 scores or fabricated dates; AI cannot set priorities; blocked independent of Done and lane; explain why suggested and what it unlocks; Apply/Ignore/Defer [S§3 Priority Engine].
- **Code:** **there is no engine.** Lanes change only when the user presses a lane button. See §5.2.

### 4.7 Focus Mode
- **Specified:** low-distraction view of one priority and its checklist; interruptions via Quick Capture; return to the same context; completion updates all progress indicators [S§3 Focus Mode].
- **Code:** from "Enter Focus Mode". Shows eyebrow, title, one-line lead, checklist (with "N of M done"), "Return to Exe", "Capture thought", "Finish session". Ticking a step re-renders the panel. Capture from here returns to Focus Mode at the same scroll.

### 4.8 Ongoing review / "adapt"
- **Specified only as the last step of the workflow** [S§0]. There is **no defined review ritual, cadence, screen or trigger** (gap P-26). The only code that resembles it is the "Review your priorities" dialog (`showFocusReview`: lists Now/Next/Later with move buttons), which on the local branch is **unreachable** (§8.3 R-01).

### 4.9 Backup, restore, reset [C]
Export downloads `exe-altr-backup.json`. Import accepts a file only if `version === 1` and the eight entity arrays exist (shapes are **not** validated), then asks for confirmation. "Reset to initial Altr example" asks for confirmation. A failed save (`localStorage` disabled/full) is **silent** — the user is not told.

---

## 5. Business logic, automation and approval boundaries

### 5.1 Derived values [C]
- `completed(outcome)` = tasks with `done`; `progress(outcome)` = `round(done / total × 100)`, **0 when no tasks**.
- `blocked(task)` = not done and some `blockedBy` task is not done.
- `pending()` = captures with `status === 'pending'` (drives the AI Review badge, bell dot and status-line link).
- Focus Mode and the hero show "N of M" from the same functions, so values agree [S§7 gate 8].

### 5.2 Lanes and the three-Now cap [C `setLane`, `showSwap`]
- Moving an outcome to **Now** when three are already Now opens "Keep focus to three" listing each current Now item as a replacement; choosing one moves it to **Next** and activates the new one. Four Now items cannot arise through the UI.
- Moving to Now makes it `currentPriority`. If the current priority leaves Now, the first remaining Now item becomes current. If none remain, the page shows "No active priorities / Choose an outcome from Next when you're ready." (with no control to do so on the page itself).
- **The cap is not enforced on import or on a migrated data file.**

### 5.3 Classification rules (`propose`) — the only "AI"
First match wins; defaults: type **Task**, workstream **technology**.
- **Type:** Idea if it contains idea / maybe / worthwhile / explore / creative / consider / incentiv / possib; else Decision if it contains `?` / should we / do we need / figure out / which area / choose between / decide; else Outcome if finaliz / establish / build a process / launch readiness; else Task.
- **Workstream:** foundation (insurance, llc, filing, register, publication, compliance) → market (pricing, price, profit, competitor, service area, location, market) → partners (partner, hiring, recruit, cleaner, onboard, spanish) → growth (seo, reviews, thumbtack, lead, website, image, alt text) → technology (backend, phone, twilio, software, code, security, dispatch).
- **"Related" outcome:** only seo, insurance, hiring, phone/twilio → communications, pricing. No duplicate detection.
- Consequence [I]: anything with no keyword is silently proposed as a Task in *Technology* (the user sees the select, but nothing flags low confidence).

### 5.4 Approval boundaries — specified vs. built

| Action | Spec | Built |
|---|---|---|
| Classify / organize a capture | Needs approval | Yes (Approve / Approve all) |
| Merge duplicates | Needs approval; sources never deleted | **Not built** (no merge exists) |
| Create dependency | Needs approval | Not built (no creation path) |
| Mark a Task done | User only | Yes; raw-capture completion does not touch tasks |
| Change lanes / promote | User only | Yes |
| Fourth Now item | Replacement confirmation | Yes |
| Resolve a decision | Suggests work for review; moves nothing | Moves nothing; **suggests nothing** |
| Delete anything | "No silent … deletion" | There is no delete path |

---

## 6. Screen behavior (including states and edge cases)

| Screen | Content and actions | Empty / error / edge states [C] |
|---|---|---|
| **Focus / Mission Status** | Heading; status line; current-priority card (progress ring "X of Y", next step, "All steps" toggle on mobile, Enter Focus Mode); "Other active priorities" rows (select to make current); desktop adds an Inbox preview column | No active priorities → empty card (no action). Fewer than 3 Now → fewer rows. No steps → "No checklist steps added yet." No other → "No other active priorities." |
| **Inbox** | Header + count ("N to-dos • M blocked" on the local branch); All/Active/Done; add field; raw rows; row menu (edit/archive/restore, provenance); "View archived" | "No to-dos in this view." Required text; 4,000 limit. Archived view lists archived only. |
| **AI Review** | See §4.3 | "Nothing to review." plus an explainer panel |
| **Map** | See §4.4 | "No steps added yet." per outcome; unknown workstream falls back to the first |
| **Decisions** | See §4.5 | "No decisions yet"; open count pill |
| **Quick Capture** (sheet) | Textarea, Save | Blank → no save |
| **Edit to-do** (sheet) | Edit `checklistText`; note that the original stays | Blank → no save |
| **Add a step / Add an option / Record your decision** (sheets) | One required field each (200 / 160 / 320 chars) | Required-field validation |
| **Search** | Matches outcomes, tasks, decisions and **original capture text** (first 20); jumps to the screen | Empty query hint; "No matches found." **Ideas and workstreams are not searched.** |
| **Workspace settings / Account menu** | Export, import, reset; mobile menu opens Search and Settings | Import errors: "Not a valid JSON file.", "Unsupported backup format.", "Could not read backup." |
| **Keep focus to three** (dialog) | Replace-one list | Opens only when a fourth Now would arise |
| **Review your priorities** (dialog) | Now/Next/Later with move buttons | **Unreachable on the local branch** (R-01) |

**Global:** Escape closes sheets (focus trapped, background inert, focus restored); toasts report outcomes; storage persists on every render. **No loading, offline, sync, conflict or permission states exist** because there is no backend.

---

## 7. Visual system

### 7.1 What the sources say (precedence: [DR])
1. Function and data: spec and [A] override any mockup text or data.
2. Dock treatment: the light-glass navigation image.
3. Layout/capture separation: the floating-capture-and-inbox image.
4. Mockup counts and percentages are illustrative; show real data.

### 7.1b What the two approved images actually show (observed in this audit)
| Observation | Image | Relevance |
|---|---|---|
| Status line reads **"1 Priority active. 2 ideas awaiting AI Review."** (not gate 9's "1 current focus out of up to 3 active") | both | P-13 / D-05 |
| Mobile secondary list is titled **"Next priorities"**, which [S§1.6]/[DR] call incorrect (they are in Now) | floating-capture | Spec label "Other active priorities" wins [DR] |
| **Dock:** five labeled tabs with a raised circular + above the dock (floating-capture); in the glass-navigation image the + sits *inside* the dock between tabs, **Map is missing**, and the fourth tab shows the Map icon labelled "AI Review" | both | D-01 and the [DR] note |
| **Inbox:** subtitle "7 to-dos • 1 blocked"; filters with counts (All 7 / Active 5 / Done 1); a blocked row tinted red with a "Blocked" pill; completed rows struck through; overflow "…" on rows (glass-navigation) | both | Matches the local Inbox header and Blocked treatment; shows blocked is a real state on a *to-do* (P-04) |
| **Inbox badge "12"** appears on the sidebar and dock while the same screen's data says 7 to-dos; the number is never explained | both | P-14 (what the badge counts) |
| Mobile current-priority card shows **one** next step with a chevron, ring "50%" with "2 of 4 tasks" | both | Matches the "Next step / All steps" pattern; 50/33/25% are illustrative [DR] |
| Sidebar lists "Project Map"; mobile uses "Map" | both | D-09 |

**[S§4] system:** single cobalt/indigo accent; clean near-white canvas; high-contrast charcoal ink; readable slate secondary text; cards with a hairline and restrained shadow; consistent radii; no nested-box sea; red = verified Blocked, green = completed only, amber = warnings, always with icon + text; clear hover/active/focus-visible/loading/success/error/disabled states; reduced motion; inputs ≥16px; ~44px targets; frosted dock with a near-opaque fallback and safe-area handling; no dark/green aesthetic, no neon.

### 7.2 What was implemented, in three layers
| Layer | Where | Summary |
|---|---|---|
| Phase 1 / PR #1 | `design-master/`, `design-tokens.css`, `styles.css`, `docs/visual-conformance/` | White canvas with lavender/cool illumination and flowing background paths, differentiated icon tones, self-hosted Inter, luminous cards, integrated glass dock with centered capture [PR] |
| Local branch (owner-directed) | `exe-ui.css`, [A] (local version) | Token-driven white theme; glass current-priority card with thin bezel; floating cards via layered shadows; small flat graphite icon-only dock containing Capture; flat cobalt buttons; one 24px circle checkbox; type scale 12/13/15/16/17/22/38; four weights; Focus Mode on the white system; progress ring "X of Y"; dark theme kept as an alternate [A, DA] |
| Audit proposals | `DESIGN-AUDIT.md` §4 | Design System v1 (tokens, components, motion, accessibility defaults) — **proposal, partly applied** |

**Conflicts between layers are recorded in §9 (D-01 to D-04).**

---

## 8. What is built, incomplete and unimplemented

### 8.1 Build sequence [S§8]
| Step | Status |
|---|---|
| 1 Baseline tests, repo, `AGENTS.md` | **Done** on PR #1 (tests exist; I did not run them) |
| 2 Navigation / accessibility / composition parity, frosted dock | **Done** on PR #1; reshaped by the owner-directed local work |
| 3 Raw Inbox + Capture completion | **Done** |
| 4 Complete AI Review + explainable Priority Engine with approval gates | **Not done** (AI Review is a prototype; no engine) |
| 5 Auth, persistence, cross-device sync, offline/error handling, safe migration | **Not started** |
| 6 E2E, real-device QA, accessibility, security review, HTTPS preview, sign-off | **Not started** |

### 8.2 Release gates [S§7] (status from code reading; PR #1's test claims noted)
| # | Gate | Status |
|---|---|---|
| 1 | 18 originals visible, verbatim | Implemented (seed) |
| 2 | Add/check/edit/archive/undo; persists | Implemented; "undo" = Restore only |
| 3 | Raw completion independent of review/task | Implemented |
| 4 | Multiline capture from any tab and Focus Mode; context return | Implemented |
| 5 | AI Review: classify, find SEO overlap, no auto-merge, edit/reject/approve | **Partial** — no overlap detection, no reject |
| 6 | Map shows workstreams, outcomes, links, three relationship kinds; decision history persists | Partial — display only; no history |
| 7 | Exactly three Now by default; fourth → replacement confirm | Implemented |
| 8 | Rings and counters match data | Implemented |
| 9 | Mission Status wording ("1 current focus of up to 3 active", AI Review count, blocked count) | **Differs** (D-05) |
| 10 | All five destinations one tap; + never covers one | Implemented (dock changed by owner direction) |
| 11 | Mobile parity for Search/Settings/backup/actions | Implemented (restored on the local branch, §8.3) |
| 12 | Viewports 320/375/390/430/768 and 1024/1280/1440, no overflow | PR #1 claims pass at all; I measured 320/375/390/430, 844×390 and 1280 only |
| 13 | Real iPhone checks | **Not done** |
| 14 | Cross-device sync and offline sync | **Not built** |
| 15 | Formal accessibility | PR #1 reports 26 axe audits clean; **not re-run on the local branch**; known gaps in [DA] |
| 16 | Security tests | Mostly **not applicable yet** (no backend); output is escaped; import validation is shallow |
| 17 | Visual comparison to approved references | PR #1 provides comparisons; local branch diverges by owner direction |
| 18 | Public HTTPS deployment | **Not done** |

### 8.3 Changes on the local branch that are not in PR #1 (some alter product behavior)
| # | Change | Kind |
|---|---|---|
| R-01 | The **"Next & Later" entry on Focus was removed**; `showFocusReview` is now unreachable. Spec requires a separate Next/Later interface [S§3]. Lane changes are still possible from Map buttons. | **Regression** |
| R-02 | Status line changed from "N in focus · M active. K awaiting AI Review" to "1 priority active." + review link | Behavior change (owner crop) |
| R-03 | The Inbox badge counts **blocked** to-dos, where PR #1 counted **pending review** captures | Behavior change |
| R-04 | `CAPTURE_TASKS` hard-codes `original-13 → hiring-backend` and `original-16 → locations-site` so two seed to-dos can show "Blocked"; also an Inbox "N blocked" subtitle | Added logic; not general |
| R-05 | Desktop Focus adds an Inbox preview column | Addition (owner crop); spec says remove redundant panels |
| R-06 | Mobile dock icon-only, Capture inside the dock; header avatar opens Search/Settings | Owner-directed; conflicts with [S§2/§4] (D-01) |
| R-07 | Progress ring shows "X of Y" instead of a percent; Map/Decisions use pickers and collapsed outcomes on small screens | Owner-approved presentation changes |
| R-08 | Per-screen document titles; skip link; removed `aria-live` from the main view | Accessibility |
| R-09 | The branch is unpushed and two commits behind PR #1's tip | Process |

---

## 9. Gaps, ambiguities and contradictions

**How to read:** **P** = product decision (needs your approval). **T** = technical decision I can make while preserving approved behavior. **D** = contradiction between sources (you decide which wins). **R** = defect/regression to restore or fix (not a decision, though R-01/R-03 touch product semantics).

### 9.1 Product decisions required (P)

| ID | Gap | Why it blocks | Sources |
|---|---|---|---|
| **P-01** | **Target user, problem statement, scope** (solo founder vs team; success measures) | Everything else (sharing, accounts, copy) depends on it | [S§9], §1 |
| **P-02** | **Initial status of the 18 imported captures.** [S§1.7] calls "pre-marked organized" a defect, yet outcomes/tasks already exist from them. Gate 5 expects AI Review to flag SEO overlap. | Decides whether AI Review is demonstrable at first run and whether duplicates are re-proposed | [S§1.7, S§5, S§7.5], seed |
| **P-03** | **First-run state for a new account:** empty workspace, the Altr seed, or both ("simple first-run empty workspace and importing the Altr seed") | Onboarding and migration design | [S§6] |
| **P-04** | **What links a Capture to structured work** after approval (and in general), and what "linked" means for Blocked/progress display. Currently only a hard-coded 2-item map. | Traceability and the Inbox Blocked badge | [S§3, S§5], R-04 |
| **P-05** | **Outcome lifecycle:** what happens at 100%; can an outcome be done/archived; does it leave Now; is the next one proposed? Outcomes with no tasks? | Progress, Focus, "adapt/review" | [S§3] (silent) |
| **P-06** | **Dependency model:** is `Task.blockedBy` or Relationship authoritative? Do outcome-level `blocks` block an outcome's readiness/tasks? Who creates, confirms or removes relationships, and where? How are user-declared vs AI-suggested shown? | Priority Engine inputs; Blocked semantics | [S§3, S§5], §3.2 |
| **P-07** | **Priority Engine definition:** meaning of "objective relevance", how effort and deadlines are captured and "verified", what "readiness" is, tie-breaking, ordering within lanes, when the engine runs, how Apply/Ignore/Defer is shown, what "unlocked downstream work" means. No deadline or effort field exists. | Step 4 cannot start without it | [S§3 Priority Engine] |
| **P-08** | **AI Review semantics:** meaning and state of **defer** (snooze? stays pending? counted?); whether **reject** exists (gate 5 says "reject", §3 does not); what **merge** produces (duplicate captures grouped? one entity? sources linked?); can one capture yield several entities; a "not actionable / note" outcome; where a Task goes when no outcome fits (currently an auto-created "Unsorted work" outcome in Later — is that approved?) | Core flow | [S§3, S§5, S§7.5] |
| **P-09** | **Decision model:** an `evidence` field distinct from notes? chosen option vs free text; how "suggested affected work" is derived and shown; history/versioning; can users create decisions directly; remove options | Decision queue | [S§3 Decisions] |
| **P-10** | **Idea lifecycle:** any actions (promote to outcome, archive, edit)? Relationship to the Later lane | Ideas are currently dead-ends | [S§3 Map] |
| **P-11** | **Now-cap edge rules:** fewer than 3 Now; zero Now (what does the empty card offer?); does a blocked or completed outcome count toward the cap; swap can only target Next today | Focus screen | [S§3 Focus] |
| **P-12** | **Where Next/Later management lives** and how a user reaches it (R-01) | Spec requires it without clutter | [S§3 Focus] |
| **P-13** | **Mission Status line contents** (both approved images say "1 Priority active. N ideas awaiting AI Review."; gate 9 says: "1 current focus out of up to 3 active", AI Review count, "verified blocked" count) and the meaning of "verified" | Gate 9 | [S§3, S§7.9], R-02 |
| **P-14** | **Badge semantics:** what the Inbox badge counts (pending review vs blocked vs active to-dos; the approved images show "12" beside "7 to-dos" with no explanation) and whether any badge is shown at all | Accuracy and anxiety trade-off | [S§2, S§3], R-03 |
| **P-15** | **Inbox sort and completed-item rules:** order, whether done items sink, auto-archive, time-based cleanup | Spec lists "sorting" with no rule | [S§3 Inbox] |
| **P-16** | **Retention and deletion:** is any hard delete allowed; undo window; audit-history length; export formats | "Never erase originals" vs user control | [S§3, S§5] |
| **P-17** | **Ongoing review:** the cadence, trigger and screen for "adapt/review"; whether a weekly review exists | Last step of the workflow has no definition | [S§0] |
| **P-18** | **Conflict and offline policy visible to the user:** last-write-wins vs field merge vs ask; what "unsynced" looks like | Required behavior for gate 14 | [S§6] |
| **P-19** | **AI service policy:** provider/model, what captured text leaves the device, consent/disclosure copy, cost limits, failure messaging when unavailable | Privacy-sensitive; user-facing | [S§3, S§6] |
| **P-20** | **Accounts:** single personal workspace per user, multiple workspaces, or sharing; naming ("Altr Workspace" is hard-coded) | Auth and data design | [S§6, S§7.16] |
| **P-21** | **Search scope:** ideas, workstreams, archived captures, ranking | Gate 11 only says "same Search" | [S§2] |
| **P-22** | **Quick Capture details:** one line = one capture (current) vs preserving a paragraph; list-marker handling; draft preservation on cancel; length limit | Data entry | [S§3, S§7.4] |
| **P-23** | **Workstreams:** fixed five, or user-editable | Map | [S§3 Map] |
| **P-24** | **Task editing:** rename, delete/archive, reorder, move between outcomes | "task create/edit/complete" is specified; edit is not built | [S§3 Map] |

### 9.2 Contradictions between sources (D)

| ID | Contradiction | Sources |
|---|---|---|
| **D-01** | **Mobile nav.** Spec: five *labeled* destinations + a *separate* elevated circular + [S§2, S§4]. Owner crops: + embedded in the dock, a tab "labelled AI Review" drawn as Map, AI Review via the bell [DR]. Owner direction (this work): icon-only dock with Capture inside. Gate 10 and gate 17 are written for the spec version. | [S§2, S§4, S§7.10], [DR], [A] local |
| **D-02** | **Card and canvas style.** Spec: near-white canvas, hairline + restrained shadow, subtle frosted dock (`rgba(255,255,255,.82)` recipe). Built: illuminated white/lavender (PR #1), then glass card, layered-shadow floating cards, graphite dock (local). The locked spec text has **not** been amended. | [S§4], [PR], [A] local |
| **D-03** | **Authority of mockups vs spec.** [DR] says the spec wins on function, mockups win on dock treatment. The owner later said the mockups/crops override the spec "wherever they differ" ([DR] local note, [A] local). The two rules overlap. | [DR], [A] |
| **D-04** | **Dark theme.** [A]: avoid deep dark modes. A dark theme alternate still exists in code and tokens. | [A], `exe-ui.css` |
| **D-05** | **Status line.** Gate 9 text vs owner crop (§P-13) | [S§7.9], [DR] |
| **D-06** | **AI Review actions.** §3 lists approve / edit-and-approve / defer / selective batch; gate 5 says edit / **reject** / approve | [S§3, S§7.5] |
| **D-07** | **Frozen entities vs audit history.** Eight entities are frozen [S§0], yet traceability and "undo/audit history" are required [S§3, S§5] and no entity holds them. Is an audit log a ninth structure or metadata? | [S§0, S§3, S§5] |
| **D-08** | **Seed capture status** (see P-02) | [S§1.7 vs S§5] |
| **D-09** | **Naming.** "Project Map" (spec/sidebar/page), "Map" (dock), "Focus" (nav) vs "Mission Status" (heading) | [S§2], [A] |
| **D-10** | **Next/Later interface.** Spec: "genuinely separate … interface". PR #1: a quiet entry to a dialog. Local: none | [S§3], [PR] |
| **D-11** | **Spec "Remove redundant panels"** vs the desktop Inbox preview column (R-05) | [S§3/S§4] |
| **D-12** | **Prototype-vs-product wording.** Spec asks that nothing present example data as true progress, while the app ships example data with an in-app disclaimer | [S§1.7, S§6] |

### 9.3 Technical decisions I can make while preserving approved behavior (T)

| ID | Decision | Constraint to preserve |
|---|---|---|
| **T-01** | Framework and migration path: keep vanilla vs React + TypeScript (+ Vite or Next) [S§6 recommends but says "choose deliberately"] | All behavior in §4–§5 unchanged |
| **T-02** | Backend: managed Postgres + auth (e.g. Supabase), row-level security, versioned migrations, idempotent writes, ID strategy (client UUIDs preserve current IDs) | Preserve existing IDs and user choices [S§5] |
| **T-03** | Schema for the eight entities, including a stable `id` on Relationship, `completedAt`/`archivedAt`, link and provenance fields | "Minimal additive change" [S§5]; the audit log's status is D-07 |
| **T-04** | Local-first store and an offline capture queue (IndexedDB vs `localStorage`), with a truthful "unsynced" indicator | Never label unsaved work as synced [S§6] |
| **T-05** | Import validation (schema, size, shape), server-side length limits, XSS posture | Reject malformed backups [S§7.16] |
| **T-06** | Server-side AI endpoint: schema-validated JSON, rate limiting, logging, manual fallback | Advisory-only [S§0] |
| **T-07** | Separate persisted **view state** (page, selections) from data; move it out of backups | No product change |
| **T-08** | Replace silent save failures with a visible, non-blocking error | No data-loss claims |
| **T-09** | Test infrastructure (run the Playwright/axe suites in CI; Safari/WebKit coverage) | Acceptance gates |
| **T-10** | CSS architecture: one token file, retire legacy CSS and `design-master/` duplication, reconcile with PR #1 | Visual decisions come from D-01 to D-04 |
| **T-11** | Install metadata and hosting (HTTPS host, manifest, icons) | Browser URL remains primary [S§6] |
| **T-12** | URL routing so screens are linkable and the back button works | Same route/state model [S§2] |
| **T-13** | Branch reconciliation of the local branch with PR #1 (rebase/merge strategy, file ownership) | Do not lose either side's work |

### 9.4 Defects / items to restore (R)
R-01 to R-09 in §8.3, plus baseline issues found in the code: `Keep in inbox` is a no-op; `Approve all` has no confirmation; capture draft lost on cancel; silent storage failure; import does not validate element shapes or the Now cap; the Inbox "undo" is only Restore.

---

## 10. Summary of unresolved product decisions

Most blocking first. Full list: §9.1.
1. **P-07 Priority Engine** — undefined inputs, deadlines, effort, readiness, ordering. Build step 4 cannot start.
2. **P-02/P-03 Initial data** — status of the 18 captures; what a new account starts with.
3. **P-08 AI Review rules** — defer, reject, merge, "Unsorted work", multi-entity captures.
4. **P-06 Dependency model** — `blockedBy` vs Relationships; confirmation of AI-suggested links.
5. **P-04 Capture→work link** — currently a 2-item hard-coded map.
6. **D-01/D-02/D-03 Which visual/navigation rules win** — and amending the locked spec so it matches reality.
7. **P-05/P-17 Outcome completion and the review ritual** — nothing defines "adapt/review".
8. **P-12/P-13/P-14** — Next/Later access, status-line content, badge meaning (R-01 to R-03).
9. **P-18/P-19/P-20** — conflict policy, AI data policy, accounts.
10. **P-01** — a written target user and scope.
