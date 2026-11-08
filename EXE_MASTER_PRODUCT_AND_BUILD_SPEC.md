# Exe — Master Product, Experience & Engineering Specification

**Version:** 1.0 — consolidated build blueprint  
**Prepared:** November 8, 2026  
**Intended reader:** Claude Code, Codex, engineering, design, QA, and the product owner  
**Document status:** Approved product direction consolidated with implementation recommendations. This is **not** evidence that a feature has been built.  
**Source of truth:** Existing Exe repository, `AGENTS.md`, `V1-LOCKED-SPEC.md`, `START-HERE.md`, and the earlier Exe V1 finalization specification take precedence for existing, verified implementation details. Where this document adds functionality, it is an additive requirement, not permission to rewrite locked workflows.

> **Instruction to the implementation agent:** Read this entire specification before modifying code. First inspect the repository and existing tests. Preserve user data, entity IDs, the approved hierarchy, navigation, current branch/PR boundaries, and visual decisions. Build in incremental, testable phases. Do not represent concepts, seeded examples, or simulated AI as production functionality.

---

## 1. Product definition

### 1.1 What Exe is

Exe is an intelligent **personal execution system**. It helps one person convert a crowded mind—tasks, obligations, ideas, unanswered questions, choices, and projects—into a trusted structure and then into concrete forward movement. Exe is not primarily a collaborative project-management suite, a notes repository, or a chatbot. The central user experience is: **capture without organizing; understand without administrative overload; decide what matters; start the next useful action; adapt as circumstances change.**

A user can capture an unstructured thought such as “Find out whether Acme needs to register in New York.” Exe stores the exact thought, optionally offers classification and connections to existing work, identifies whether the item needs a quick factual answer, deeper research, a decision, or an action, and surfaces useful recommendations. The user remains the authority over conclusions, structured changes, priorities, deadlines, and completion.

**Customer-facing promise:** “Less organizing. More doing.”  
**Internal product test:** Exe succeeds only if it decreases the mental and administrative effort between intention and meaningful progress.

### 1.2 Problem to solve

People experience competing responsibilities, incomplete information, unclear next steps, unresolved decisions, and constant reprioritization. Conventional task lists store work but require significant manual organization. AI-assisted lists may generate more tasks and suggestions than users can process. Exe instead combines low-friction capture, a contextual work map, an explainable prioritization engine, tightly constrained focus, and optional research that can remove information-gathering work.

### 1.3 Intended primary user and scope

- Initially a **single individual** managing many parallel workstreams, particularly a founder, operator, independent professional, or ambitious personal project owner.
- First-class **mobile-browser and desktop web** experiences with feature parity. No native app requirement.
- Product architecture remains personal rather than multi-user team collaboration. Team permissions, delegated approvals, billing, a calendar suite, and autonomous external transactions are **out of scope** unless explicitly approved later.
- Users are not required to use AI. The Inbox, tasks, outcomes, decisions, focus, and backup remain useful when AI is unavailable.

### 1.4 Product principles, ordered

1. **Capture is always easy.** The user can record something without providing metadata.
2. **User intent is authoritative.** AI suggests; it does not silently alter meaningful work state.
3. **Execution outweighs organization.** Always offer a feasible next step when enough information exists.
4. **Strategic importance is not immediate actionability.** Protect high-impact outcomes while suggesting feasible actions.
5. **Minimize review burden.** Not every AI insight deserves an interruptive card or approval click.
6. **Preserve the source.** Raw captures, original wording, provenance, and user decisions remain accessible.
7. **Be honest about evidence.** A guess is not a fact; a search snippet is not a verified answer.
8. **Never invent progress.** Only confirmed actions can complete tasks or decisions.
9. **Small, restrained interface.** The intelligence belongs behind clear decisions, not endless dashboards.
10. **Explainability and reversibility.** Recommendations describe why; applied changes support undo/audit where feasible.

---

## 2. Non-negotiable baseline and change control

### 2.1 Locked core model

Keep exactly these eight **core domain entity types** as the public conceptual model: `Capture`, `Workstream`, `Outcome`, `Task`, `Decision`, `Idea`, `Relationship`, and `FocusAssignment`. The term “project” may appear as an organizing context in prose or the UI; it is **not authorization to introduce a ninth core Project entity**. Do not replace Outcomes with goals, epics, missions, or AI-generated equivalent types.

Existing workstreams, outcomes, links, identifiers, and choices must survive migrations. Preserve the five existing Acme workstreams in the real data; inspect their exact names and IDs in source rather than recreating them from guesswork. Preserve the three approved example active outcomes in existing data where applicable: **Confirm New York business registration**, **Determine first service area**, and **Define Backend V1**. No fabricated completion statuses.

### 2.2 Locked process

**Quick Capture / Inbox → AI Review → Project Map and Decision Queue → explainable Priority Engine → Focus Board (Now / Next / Later) → Focus Mode → adaptation and review.**

These are interconnected capabilities, not a mandatory wizard. Users may skip AI Review, act on Inbox items, browse the Map, and enter Focus Mode without satisfying an artificial process gate.

### 2.3 Locked navigation

Five destinations on desktop sidebar and mobile floating dock, with readable labels:

1. **Focus**
2. **Inbox**
3. **AI Review**
4. **Map**
5. **Decisions**

**Quick Capture** is a separate global action, a circular cobalt `+` elevated slightly above the mobile dock, not a sixth tab and not obscuring the center destination. **Focus Mode** and **Priority Engine** are contextual capabilities, not permanent navigation destinations. **Search**, **Settings / Workspace**, and **JSON backup / restore** must be accessible on both device classes, likely from a compact header/overflow menu.

### 2.4 Locked interaction safeguards

AI may not silently delete or merge captures, reclassify or reorganize work, create authoritative dependencies, fabricate deadlines, mark tasks completed, resolve decisions, or promote/reorder major priorities. Suggest and require approval. A checked raw Capture does **not** mean a linked Task is done; AI-review state is likewise independent of capture completion. Never use “organized” as shorthand for “completed.”

### 2.5 Approval scope of the enhancements in this document

The owner has approved adding the previously proposed improvements: stronger actionable Focus Mode; separation of strategic importance, operational priority, and immediate next action; selective, low-noise AI Review; visible decision support; clarified outcome-level focus; recommendation provenance and metrics; and **AI Quick Answers / Guided Research / Decision Research Support**, including proactive suggestions. These are **additions within existing navigation and hierarchy**. Supporting implementation tables, API services, and job records may be added as internal infrastructure; they are not automatically new user-visible core entity types.

---

## 3. Mental model, semantics and ownership

### 3.1 Three levels of work

- **Outcome:** a result the user wants to achieve, such as “Determine first service area.” Outcomes are what FocusAssignments place in Now, Next, or Later.
- **Task:** a specific action that contributes to an outcome, such as “Compare contractor supply in three candidate cities.” Tasks have clear done/not-done criteria and may have checklist children only if already supported by the existing schema/implementation.
- **Decision:** an unresolved choice that may block or inform one or more outcomes, such as “Which city should Acme launch in?” A decision is not disguised as a task merely to make a checklist simpler.

A user can complete several Tasks under one active Outcome without consuming multiple Now slots.

### 3.2 Three levels of prioritization

1. **Strategic importance:** why an Outcome matters to the user's stated objectives, long-term value, and high-impact dependencies.
2. **Operational priority:** whether an Outcome deserves a Now / Next / Later slot considering confirmed deadlines, blockers, readiness, resource constraints, and explicit user overrides.
3. **Immediate actionability:** which available Task, decision-review step, or next research action is most useful **right now** given available time, complexity, and constraints.

Do not infer that an actionable small task is strategically more important than a blocked, high-value outcome. Recommending an immediate step can leave all FocusAssignments unchanged.

### 3.3 Status dimensions are orthogonal

A raw Capture may simultaneously be `active`, `AI review approved`, `linked to an Outcome`, and `not done`; never collapse these into one field. An Outcome may be assigned `Now` while blocked; blocker state does not equal the Focus lane. A Decision can be `resolved` without automatically completing any dependent Task. An AI research result can be `ready` without validating every inference in its content.

### 3.4 Concrete definitions

- **Ready:** no user-confirmed hard blocker prevents the proposed next action.
- **Blocked:** a verified, user-confirmed `blocks` dependency or user-marked obstacle prevents a specified action; speculative AI hints do not count.
- **Progress:** computed from user-confirmed work data, never hallucinated percentages.
- **AI suggestion:** a proposed change or guidance item that remains pending until authorized; read-only findings are distinct from write actions.
- **Quick Answer:** compact, sourced factual assistance; it is not inherently a Task completion.
- **Guided Research:** multi-step evidence collection/comparison with explicit scope, budget and approval.
- **Evidence:** a source reference, date of retrieval/publication when available, quote/summary, and trace from claims to sources.
- **Current priority:** the single highlighted Outcome among up to three Now Outcomes.

---

## 4. Information architecture and global shell

### 4.1 Desktop

Use a restrained left sidebar with the five destinations, compact active marker, accessible pending counts, and a reliable global Quick Capture trigger. Main content uses a readable max width, generous whitespace, slim headers and strong typographic hierarchy. Search and Workspace / Settings are visible or discoverable without adding competing dashboard tiles. A wide viewport may show contextual secondary detail, but never duplicate Next lists or noisy metrics merely to occupy space.

### 4.2 Mobile web

Bottom dock presents the same five labeled destinations; separate elevated cobalt `+` opens the capture sheet. Preserve usable touch targets, mobile keyboard avoidance, safe-area insets, background content padding, and focus restoration on close. On small screens, details drill down to full-width surfaces rather than condensed graphs or multi-column cards. Five destinations must remain clear at **320, 375, 390, 430px** widths; never hide AI Review behind a notification icon as a substitute for its tab.

### 4.3 Shared UI states

Every important screen/component must define: initial loading, populated, empty, no search results, inline editing, optimistic save, confirmed save, unsynced, validation error, permission required, AI unavailable, offline, and retry. A control cannot display a success checkmark before the persistent write is confirmed. Use semantic messages and accessible live regions for asynchronous results.

### 4.4 Global navigation and browser behavior

Use accessible browser routes and back navigation, stable deep links to Outcomes/Decisions where authorized, preservation of filters after returning from detail, and clear exit behavior from Focus Mode. Search and Settings remain accessible on every device. Keyboard shortcuts on desktop must never override text entry, screen reader interaction, or system browser shortcuts.

---

## 5. Screen specification: Quick Capture

### 5.1 Purpose

Record a thought **immediately** without selecting a workstream, priority, type, or due date. A capture is always persisted before further AI processing.

### 5.2 Entry points

- Elevated floating mobile `+` available from every tab and from Focus Mode.
- Single global desktop action and optional documented shortcut.
- Inline Inbox add (for short single to-dos) is a separate convenient entry path that writes the same `Capture` entity.

### 5.3 UI contract

Compact modal/sheet with automatic focus, prominent editable field, `Save` action, and `Cancel`/close. Support multiline freeform text; clearly show unsaved and saving states. Mobile input typography minimum **16px**; sheet can scroll when virtual keyboard is open. Avoid mandatory chips or categories. Do not surround the text field with redundant complex capture forms.

### 5.4 Save rules

- Trim accidental leading/trailing whitespace for validation but preserve the user's meaningful wording and internal line breaks in stored source text.
- Empty or whitespace-only content cannot save; give a concise inline error.
- For an explicit brain-dump list with separate nonempty lines, create one raw Inbox Capture per item, retaining a common batch/provenance reference and original block text in optional metadata. If text is a continuous paragraph or multiline note, preserve as one Capture. The chosen segmentation must be deterministic and reversible; never silently discard lines.
- Duplicate capture **detection** is permitted later; automatic merge is not.
- Generate idempotency key before write; retry without creating duplicates.
- If offline, store in durable local pending queue and mark `Not synced`; after reconnect synchronize and reconcile. Never claim remote save before confirmation.
- Return to the exact prior tab, scrolled position when feasible, and Focus Mode session state after close/save.

### 5.5 Acceptance examples

Capture “Research LLC requirements” from Focus Mode; save; the raw Inbox text appears and the user remains in Focus Mode. Capture five separate list lines; all five appear with original text/provenance; refresh and sync do not duplicate entries.

---

## 6. Screen specification: Inbox — raw checklist first

### 6.1 Purpose and first viewport

Inbox must be usable as a simple traditional to-do list **without AI**. The first content after the header is **All / Active / Done**, an inline `Add a to-do…` entry, then the actual raw Capture rows. Do not place a large AI instruction card ahead of the list.

### 6.2 Capture row anatomy

- A visibly usable checkbox, appropriately sized with an accessible label.
- Original wording; show enough text to understand the item and expand long entries.
- Optional concise created time, provenance, and subtle review indicator.
- Context menu: edit, archive, restore/undo, view linked work, optional review request.
- Completed presentation with strike-through or equivalent; status is not communicated solely by color.
- For AI findings, show a quiet contextual affordance only when useful, never insert fabricated answer text.

### 6.3 Filters and ordering

`All` displays active and done Captures (archived may be separately accessible); `Active` displays unchecked; `Done` displays checked. Preserve last chosen filter on navigation. Choose a stable, transparent sort (suggest newest capture first for All/Active, most recently completed for Done); users may override if the baseline supports sorting. Do not automatically move a Capture from Inbox when classified.

### 6.4 Completion semantics

Checking a Capture sets only its independent completion metadata. It must not auto-resolve a linked Decision, mark linked Task done, remove a FocusAssignment, dismiss AI research, or infer user satisfaction with an answer. Uncheck reverses only the Capture completion. If user wishes to reconcile linked work, offer an explicit action and explain consequences.

### 6.5 Edit, delete, archive

Editing original capture text should retain an audit/version trail or clearly distinguish edited text from untouched source. Archive is non-destructive and reversible. Destructive deletion requires clear confirmation and safe cascading behavior; prefer archive. No AI may delete raw captures.

### 6.6 Empty and problem states

Empty Inbox: a small invitation to capture a thought. Active filter empty but Done populated: “Nothing active” with filter switch. If local and server versions conflict, preserve data, explain the conflict and offer predictable recovery. Do not hide unreviewed items or enforce AI Review before checklist use.

---

## 7. AI Review — advisory and low-noise organization

### 7.1 Goal

Convert raw Captures into suggested structured meaning while minimizing administrative work. AI Review is a **destination** in the five-tab navigation, but reviewing is optional and not a gate to execution.

### 7.2 Proposal content

Show source Capture verbatim alongside editable suggestions: likely item type (Task, Decision, Idea, Outcome, or ordinary note/raw Capture), candidate Workstream, candidate Outcome, potential duplicate/related captures, proposed relationship kind (`blocks`, `informs`, `related`), brief reasoning, and confidence/uncertainty expressed in plain language rather than a deceptive numerical confidence.

### 7.3 Review actions

- **Approve:** commit selected structured changes atomically while retaining source Capture.
- **Edit & approve:** adjust type, target, or proposed links before committing.
- **Defer:** dismiss from immediate queue without losing the Capture or the recommendation.
- **Reject:** do not apply; keep source and record user feedback to reduce repeats.
- **Selective batch approve:** user can review a group and approve selected low-risk proposals, with preview of changes. Never batch-approve destructive merges/dependencies/priority shifts without item-level understanding.
- **Undo:** revert an approved change where data integrity permits; never erase the original source.

### 7.4 Noise control / progressive intelligence

Rank proposal visibility by actual utility. Group compatible recommendations and duplicates. Do not generate one interruptive alert for every trivial classification. Do not repeatedly ask approval for the same unchanged proposal. An AI result may be quietly available in its relevant context without an Inbox banner. The user may complete raw work from Inbox while review remains pending.

### 7.5 Duplicate handling

For suspected duplicates, propose **linking or consolidation** with both originals visible and a preview of the canonical structured item. On approval, retain provenance from every Capture; never delete either source. Partial similarities may warrant `related`, not duplicate. Existing overlapping SEO captures are a migration example requiring explicit approval.

### 7.6 AI failure handling

AI endpoint runs on server, validates structured output against a strict schema, enforces workspace authorization and time/cost budgets. If model response fails, keep raw data usable and offer manual organization. Keyword heuristics in prototype must be labeled simulation, not real AI.

### 7.7 Status and auditing

Store proposal status (`pending`, `approved`, `edited_approved`, `deferred`, `rejected`, `superseded`), actor, timestamp, source IDs and change set in **supporting records**; do not change the eight core entity taxonomy. Re-evaluations should be keyed to source version so the same suggestion is not continually recycled.

---

## 8. Map — contextual structure without daily overhead

### 8.1 Purpose

The Map answers “How does my work fit together?” rather than requiring the user to maintain complex diagrams each day. Show existing Workstreams, Outcomes and Tasks, plus related Decisions, Ideas and Relationships. The user can work without opening the Map.

### 8.2 Hierarchy and drill-down

Display a manageable list of Workstreams; clicking reveals Outcomes; opening an Outcome reveals description/definition of done, Tasks, Decisions, dependencies, related captures, current Focus lane, progress, and actions. Mobile uses list/detail screens, not a cramped network graph. Desktop may show wider relationships if readable.

### 8.3 Relationship semantics

- `blocks`: a true prerequisite for the specified work; only user-verified relationships create a hard blocked state.
- `informs`: useful context or evidence that may influence the work, but need not prevent progress.
- `related`: conceptual association without implied sequencing.

Show arrow direction and concise explanation. AI-inferred but unapproved relationships appear explicitly as suggestions, not authoritative edges. Reject invalid self-blocks and hard dependency cycles; allow nonblocking related associations.

### 8.4 Task and Outcome actions

Create/edit Task; check and uncheck; set description or user-confirmed due date; link to an Outcome; view supporting captures/research; identify next feasible action. Edits to strategic scope, dependency, or completion obey explicit approval. Outcome completion should be based on user confirmation/defined result, not merely a guessed percentage derived from checkboxes.

### 8.5 Progress

Show task counts and progress derived from actual confirmed tasks with clear denominator rules (exclude archived/canceled tasks). For Outcomes without trackable tasks, show a non-numeric state or clear “Not measured” instead of 0% presented as certainty. When an Outcome has user-defined completion criteria, require criteria confirmation before treating it as achieved.

---

## 9. Decisions — dedicated queue and evidence-informed judgment

### 9.1 Purpose

Help the user see **which unresolved choices prevent progress**. Decisions are first-class objects, not disguised tasks. The Decisions tab shows unresolved and resolved decisions, with consequential ones surfaced prominently but not noisily.

### 9.2 Queue row

Decision question, linked Outcome/Workstream, status, affected work count if grounded, blocked/unblocked distinction, pending findings, and next decision step. Sort primarily by **verified impact on active work**, then user-verified urgency, then recency; don't sort solely by AI's persuasive prose.

### 9.3 Decision detail

Question, scope, options, known facts, unknowns, user criteria, advantages/tradeoffs, linked work, relevant captured notes, AI Research findings with citations, and a durable decision log. Options remain editable by the user. AI may suggest missing options but cannot introduce them as established choices without a clear label.

### 9.4 Decision actions

Add/edit option; request Quick Answer or Guided Research; record evidence; compare options; select a decision; add rationale; mark resolved; reopen. Resolving a Decision records choice and date and **suggests**, rather than silently applies, changes to affected dependencies, next tasks or Focus lanes.

### 9.5 Decision support requirements

For consequential recommendations, show comparison dimensions and uncertainties, not a single unexplained “best option.” Separate verified source facts, assumptions, and AI inference. If evidence conflicts, show disagreement and recommend further verification. If an answer remains unclear, the useful output is often a narrower next research question, not forced certainty.

---

## 10. Priority Engine — deterministic, explainable suggestions

### 10.1 Purpose

Recommend which Outcomes merit the three Now slots, what belongs in Next or Later, and what immediate action to take, without coercing users or fabricating scores. Use AI to draft explanations or identify **candidate** signals; authoritative ranking inputs come from validated application data and user-approved relationships.

### 10.2 Input contract

- User-stated objective/outcome relevance (confirmed, not inferred and silently installed).
- Verified deadlines and urgency; never hallucinated dates.
- User-confirmed hard blockers and dependency impact.
- Readiness of actionable next steps.
- Estimated effort/time, if supplied or labeled as estimate.
- Existing Now/Next/Later assignments and explicit manual overrides.
- Recently completed or newly actionable tasks/decisions and valid research findings.

### 10.3 Decision order (transparent qualitative algorithm)

1. Validate all candidate records and prevent missing/deleted IDs.
2. Preserve explicit user-pinned priorities unless user approves replacement.
3. Mark work blocked only from confirmed conditions, not AI inference.
4. Identify strategic outcomes whose deadline, impact, or dependency unlocking justifies attention.
5. Distinguish what can progress today from what needs a separate unblock/research action.
6. Generate a ranked **proposal** for Now/Next/Later based on an inspectable rule order, with tie-break rationale. Do not expose synthetic `87/100` scores.
7. Compare against the current board; explain exactly what would change.
8. On Apply, request user confirmation for any change to Now and preserve before/after audit.

### 10.4 Now lane invariant

There may be **zero to three** Now Outcomes, never four. The current focus is one selected Outcome *within* Now; remaining Now Outcomes are **Other active priorities**, not Next. If a fourth is requested, force a review and explicit choice of which Now Outcome to replace; apply replacement transactionally. Changing current focus within Now does not require reshuffling the entire lane. The user can still check a raw Inbox item or complete work outside Now.

### 10.5 Immediate action suggestions

Immediate actions should be sensitive to readiness, estimated time, context, known blockers, and the fact that small feasible work can advance a larger outcome. A 20-minute actionable Task may be recommended without changing the strategic rank of a blocked high-impact Outcome. If available-time input is not provided, do not pretend the system knows the user's calendar or energy; offer neutral, useful next steps or an optional “I have 20 minutes” control, not another mandatory workflow.

### 10.6 Recommendation presentation

Each recommendation explains: what to do/change; why it matters; the confirmed evidence; what becomes unblocked; why another option was not selected when relevant; and clear `Apply`, `Ignore`, `Defer`. Suggestions expire/recalculate when their underlying facts change. Rejecting a suggestion should not trigger an immediate identical recommendation.

---

## 11. Focus / Mission Status — primary home

### 11.1 Layout

Compact **Mission Status** heading with a live, truthful state line. No oversized greeting or top strip of vanity metrics. One prominent **Current Priority** Outcome card with actual progress, concise checklist, visible next action, blocker status if confirmed, and `Enter Focus Mode`. Two additional Now Outcomes display as compact **Other active priorities**. Keep Next and Later accessible separately, not repeated in stacked summary panels.

### 11.2 Current priority card

Show title, Workstream context, count of verified completed/total actionable Tasks, explicit progress or neutral state, one meaningful next step, and optional “Why this?” explanation tied to Priority Engine. Provide direct task interactions while respecting confirmation semantics. Do not present invented percentage rings.

### 11.3 Choosing current focus

A user may select any existing Now Outcome as current. If no Now Outcomes exist, show an empty state guiding them to choose work; do not seed random priorities. If current focus becomes archived/removed, prompt for a replacement from Now, and preserve history.

### 11.4 Blocked state

Use semantic red **only for verified block**; include icon/text and a useful unblock action such as open linked Decision, review dependency, or research unresolved prerequisite. Never let a speculative AI edge turn the main card red without confirmation.

### 11.5 Focus recommendation UX

If AI sees a very small immediate step, show it as “Suggested next action” without adding a permanent navigation section. Keep its origin, estimated duration if known, and why. Do not automatically create new Tasks from the recommendation without approval.

---

## 12. Focus Mode — bridge from intention to action

### 12.1 Entry and exit

Open from current priority or actionable item. Focus Mode is contextual and low-distraction, not a new sidebar/dock destination. Exit returns to previous context with state intact. Preserve current scroll/selection when capturing an interruption.

### 12.2 Content hierarchy

1. The Outcome and concrete definition of success.
2. The single feasible next Task/step, or clearly stated reason there is not one.
3. A focused checklist of user-confirmed tasks.
4. Progress based on actual completions.
5. Optional “Why this action?” rationale and small AI assistance controls.
6. Quick Capture available without leaving the session.

Hide unrelated dashboards, noisy recommendations and secondary navigation clutter without trapping keyboard/screen reader users.

### 12.3 Make work actionable

When the next item is vague—“Research New York registration”—the system may **suggest** a small task breakdown, e.g. “Read official state foreign LLC guidance; identify applicability factors; record unresolved questions.” The user may accept/edit the checklist or simply begin; the AI does not create authoritative tasks without permission. If a question can be answered by safe Quick Answer, offer the finding in context rather than forcing a research task.

### 12.4 Blocked and finished behavior

When truly blocked, focus displays the verified obstacle and actionable unblock options: inspect Decision, review relationship, conduct research, or switch current focus (all user-directed). On Task complete, recalculate progress and offer the next available step. On Outcome complete, request confirmation of Outcome's definition of done, then suggest rather than auto-apply a replacement Now Outcome.

### 12.5 Interruptions and accessibility

Quick Capture opens over Focus Mode and returns there after save/close. Honor escape/back semantics, reduced motion, keyboard navigation, focus trap inside actual modal, and mobile viewport/keyboard behavior. Never start attention timers or notification streams without explicit product approval.

---

## 13. AI Research Assistance — new core capability

### 13.1 Product intent

Exe should sometimes **remove work**, not merely create tasks for the user. For questions or missing information linked to Capture, Task, Outcome, or Decision, Exe may offer: (A) **Quick Answer** for a contained factual question; (B) **Guided Research** for complex or multi-source investigations; (C) **Decision Support** where evidence informs an unresolved choice. This feature lives within Inbox, AI Review, Decisions and Focus/Map context. **Do not add a sixth Research navigation tab.**

### 13.2 Research classification / triage

An AI triage step can propose one of:

- `no_research`: straightforward action, emotional note, creative idea, personal intention or unclear item.
- `quick_answer_candidate`: specific checkable question with small information need and publicly authoritative answer.
- `guided_research_candidate`: broad comparative/strategic question, requires multiple sources or assumptions.
- `decision_evidence_candidate`: evidence needed for an unresolved Decision.
- `high_risk_or_sensitive`: legal, financial, health, private/confidential, personal data, or high-consequence assertion requiring deliberate scope and safeguards.

Triage output is a **proposal**, not a command. It must not cause automatic data mutation. If unclear, ask one concise scope clarification when initiating research, not during raw capture.

### 13.3 Permission model — hybrid, privacy-first

**Default:** suggestion-only. Lightweight automatic public-source Quick Answers become eligible **only if the user enables an explicit opt-in preference** after seeing what may be transmitted to the research provider and the resource limit. Deep/multi-step research always requires per-run authorization with visible scope and estimated cost/time category. Sensitive/private material, documents, account data, or high-stakes personal queries always require explicit per-run approval; never automatically send private workspace details off-platform merely because they appear in a Capture.

Permissions are separate from permission to **apply conclusions**. Reading public web content never grants permission to mark a task Done, resolve a Decision, create a blocker, or change the Focus Board.

### 13.4 Proactive suggestions

When Exe detects a meaningful unresolved information gap that could unblock work, it may unobtrusively show: “I can check official guidance and summarize what may apply.” Show why the suggestion is relevant, what data would be used, approximate research scope, and `Research`, `Not now`, `Don't suggest for this item`. Rank by confirmed impact; throttle repeated suggestions; avoid cluttering Inbox. Research should not be triggered on every capture.

### 13.5 Quick Answer workflow

1. Detect a narrowly scoped factual question.
2. Apply permission/risk/cost/privacy policy.
3. Retrieve public primary sources where possible; record search/retrieval timestamps.
4. Extract the answer and supporting facts; check against source content, not just snippets.
5. Return **short answer**, **source links**, **date verified**, **limits/uncertainty** and `View detail`.
6. Keep it attached to the originating item; user may choose `Useful`, `Needs checking`, `Save as note/evidence`, `Create follow-up Task` (explicit user action).
7. Never auto-check the raw Capture or Task simply because an answer exists.

If sources are absent or conflict, show “I couldn't verify this reliably” and a narrower proposed next step. Never fabricate filing fees, deadlines, URLs, prices, legal obligations or source citations.

### 13.6 Guided Research workflow

1. **Propose:** concise research objective, candidate questions, source categories, expected outputs, estimated resource band, use of user context.
2. **Authorize:** user edits scope and starts an explicit run. Allow cancellation.
3. **Plan:** server writes a versioned plan with subtasks and source policy; avoid endless recursive research.
4. **Retrieve:** gather reputable primary/public sources, optionally user-authorized documents/connectors; never infer access permission merely from their existence.
5. **Evaluate:** distinguish source facts from model assumptions, reconcile dates, remove duplicates, flag conflicting estimates.
6. **Synthesize:** executive finding, comparison where needed, assumptions, credible citations, uncertainty, areas needing expert confirmation.
7. **Deliver:** attach result to relevant Capture/Outcome/Decision; show progress state and truthful completion. Never claim fresh verification if retrieval failed.
8. **Act on findings:** propose **separate**, reviewable actions such as adding a Task, updating a Decision option or suggesting readiness change. No automatic authoritative write.

The user can leave the view while an authorized run is executing; UI must truthfully show queued/running/canceled/failed/completed status and recover on reload. This describes product behavior, not a promise by this assistant to perform background work.

### 13.7 Decision research workflow

A Decision detail can ask Exe to compare options by explicitly chosen criteria. Report: option-by-option evidence, benefits, costs, tradeoffs, uncertainties, source dates, information gaps, and a *conditional recommendation* with rationale. If the question is inherently judgmental, highlight that facts cannot resolve the user's personal preferences. User alone resolves the Decision.

### 13.8 Research result anatomy

- Title and provenance: originating item and requestor.
- Query/approved scope, source access boundary and start/end timestamps.
- Short finding and “What this means for your work.”
- Claim-level source citation(s), direct source links, publication/last-updated/retrieved dates when available.
- Verified facts vs calculations vs model inference vs user-provided assumptions.
- Confidence expressed in plain English, coverage limitations, conflicting evidence.
- Optional comparisons and research method summary.
- Explicit user actions: `Open sources`, `Save finding`, `Ask follow-up`, `Propose tasks`, `Review affected decision`, `Dismiss`.
- Research freshness label when data could change (government rules, pricing, schedules, employment, availability).

Research references should retain persistent metadata, but do not cache/distribute large copyrighted source bodies unnecessarily. Citation URLs must not be fabricated; inaccessible or stale links need a visible warning.

### 13.9 Risk, hallucination and prompt-injection defenses

Treat webpages, files, search results and AI output as **untrusted input**. Never execute instructions embedded in retrieved content. Limit network/file access by permission scope. Sanitize rich content and URLs. Verify claim-source alignment; protect against source laundering (many copies of one unsourced claim). Require clear high-stakes disclaimers and authoritative primary sources when applicable. For legal/financial/medical matters, support research and questions to verify with a qualified professional, not false definitive decisions. If conflicting evidence persists, expose the disagreement rather than guessing.

### 13.10 Cost / rate governance

- Research modes: quick (bounded, opt-in eligible), standard guided (approval), deep comparative (approval and explicit larger budget).
- Per-user daily/monthly configurable quota plus service-side hard caps; queue limits, token/query budgets, timeout and cancellation.
- Show understandable “light / standard / extensive” cost/resource estimates if exact money is not known; never imply exact pricing without cost data.
- Stop loops on insufficient evidence; expose partial findings with limitations.
- Deduplicate identical public lookups for the same source version when permitted, without sharing private workspace data across accounts.

### 13.11 Freshness and invalidation

Store researched-at and source timestamps. A finding becomes **possibly stale** when relevant facts change, the user changes question/scope, or a user-configurable time horizon passes; do not silently update it into a new answer. Offer `Refresh research` subject to the same permission/cost rules. A stale result can remain attached as historical evidence with a visible label.

### 13.12 AI result-to-work boundaries

| Research output | May Exe do it automatically? | Required condition |
| --- | --- | --- |
| Attach read-only quick answer | Only after relevant opt-in; otherwise suggest | Low-risk, bounded public lookup |
| Propose research on a captured question | Yes, quietly | Relevance, suppression rules |
| Start multi-source research | No | Per-run approval |
| Fetch private documents / transmit personal content | No | Explicit scoped authorization |
| Propose a Task / Decision / relationship | Yes | Proposal only |
| Commit new Task / dependency | No | User approves |
| Mark Capture or Task complete | No | User confirms |
| Resolve Decision | No | User resolves |
| Reorder Now priorities | No | User confirms, max-three invariant |

---

## 14. Adaptation and Review — useful changes, not constant churn

### 14.1 Triggers

Only meaningful events trigger reconsideration suggestions: verified blocker cleared, Task confirmed complete, Decision resolved/reopened, new user-confirmed deadline, change in an active Outcome, relevant approved research finding, or user-invoked review. Avoid auto-reprioritizing every time an Inbox Capture is added.

### 14.2 Review presentation

Small contextual prompts such as “This Decision is resolved; two linked tasks may now be actionable” with `Review changes` and `Later`. Explain source event and proposed effect. Bundle compatible changes, provide before/after, and keep user overrides sticky until changed explicitly.

### 14.3 Reflection loop

Optional lightweight weekly review (not a mandatory recurring automation): outcomes progressed, items waiting, decisions unresolved, AI suggestions accepted/rejected, and stale information requiring refresh. Let the user ignore it. Do not conflate engagement metrics with achievement.

---

## 15. Search, settings, workspace and data portability

### 15.1 Search

Search raw Capture wording, Tasks, Outcomes, Decisions, Ideas and Research findings with role/ownership checks. Show type/source and navigable context. No invented semantic associations; clearly label AI semantic matches if added. Mobile access parity is required.

### 15.2 Settings / Workspace

Provide: account/session, research opt-in and budget preferences, sensitive-data/connector permissions, notification choice if eventually supported, reduced motion/system appearance compatibility, import/export/restore, data privacy/export controls, and help. Do not introduce a global dark theme contrary to approved V1 light design unless approved later.

### 15.3 Backup, export and restore

Keep validated JSON export/import until authenticated cloud sync is production-proven. Include schema version, timestamps, core entities, relationship references, completion metadata and research references where legally/exportably appropriate. Make restore a preview with counts and conflict handling; reject malformed, unexpectedly huge, or cross-account payloads safely. Never overwrite user data without confirmation and rollback path. Validate XSS-bearing strings and URL fields before display.

### 15.4 Authentication / cross-device

Personal authenticated workspace with server-side authorization and secure sessions; all objects must be tenant/user-scoped, including research jobs and sources. Sync desktop/mobile reliably, with offline capture queue and clear unsynced status. Merge conflicts by field-version policy or user choice, not blind last-write-wins for important decisions and priority assignments.

---

## 16. Canonical domain model and persistence contracts

### 16.1 Entity table — conceptual contracts

All fields below are **implementation contract suggestions**; map to existing schema first. Do not rename existing fields or introduce destructive migrations to match this notation.

| Core entity | Required meaning / typical fields | Critical invariant |
| --- | --- | --- |
| `Capture` | ID, owner/workspace, raw text, created/updated, source/provenance, `completedAt?`, archivedAt?, review/link references | Source preserved; raw completion separate from Task state |
| `Workstream` | ID, name, description, user-defined order/status | Preserve existing Acme workstreams |
| `Outcome` | ID, Workstream reference, title, success definition, status, ordered Tasks | Focus assignments attach to Outcomes |
| `Task` | ID, Outcome reference (nullable if baseline allows), title, notes, doneAt?, user deadline?, effort estimate? | Only user-confirmed completion writes doneAt |
| `Decision` | ID, question, options, evidence, status, selected option?, resolution notes/time, linked work | AI cannot resolve it |
| `Idea` | ID, text, context, related objects, state | Ideas aren't automatically commitments |
| `Relationship` | ID, source type/ID, target type/ID, kind `blocks/informs/related`, confirmation provenance | Only confirmed blocks can hard-block |
| `FocusAssignment` | ID, Outcome ID, lane `Now/Next/Later`, order, current-focus flag or reference | Now count <= 3, current focus is a Now Outcome |

### 16.2 Supporting implementation records (not new core user-facing entities)

Approved additive functionality may require internal tables such as `AiProposal`, `ApprovalAudit`, `ResearchRun`, `ResearchFinding`, `ResearchSource`, `SyncMutation`, `UserPreference`, `EventLog` and `IdempotencyKey`. These are service/storage concerns, not new public taxonomy. Their implementation names may differ. Each must include owner scoping, created/updated timestamps and retention policy.

### 16.3 Research run fields

`id`, `workspaceId`, `originType`, `originId`, `mode`, `status`, `requestText`, `approvedScope`, `permissionSnapshot`, `riskClass`, `budgetClass`, `progressStage`, `startedAt`, `completedAt`, `failedAt`, `canceledAt`, `errorCode`, `modelVersion`, `searchProviderVersion`, `sourceIds`, `resultVersion`, `proposedActionIds`, `createdBy`. Store sensitive request content only where necessary, encrypt at rest, and honor deletion/retention controls.

### 16.4 Research state machine

`proposed → awaiting_approval → queued → running → synthesizing → ready`, plus `canceled`, `failed`, `expired/stale` result indicator. Quick auto-opt-in path may proceed directly from `proposed → queued` only when policy allows. Canceled/failed work cannot display success. Retrying uses a new attempt reference and preserves audit without duplicate authoritative Task writes.

### 16.5 AI proposal schema — example contract

```json
{
  "schemaVersion": "1",
  "captureId": "existing-capture-id",
  "sourceVersion": 3,
  "suggestedType": "decision",
  "suggestedWorkstreamId": "existing-workstream-id-or-null",
  "suggestedOutcomeId": null,
  "relationshipProposals": [
    {"targetType": "outcome", "targetId": "existing-id", "kind": "informs", "reason": "..."}
  ],
  "duplicateCandidateIds": [],
  "researchSuggestion": {"mode": "quick_answer_candidate", "reason": "..."},
  "explanation": "Short plain-language justification",
  "uncertainties": []
}
```

Server must validate with exact enums, supported ID ownership, allowed length, no duplicate references, no self-blocking, and stale-source-version checks. Invalid fields are rejected; never trust model-generated IDs/URLs blindly.

### 16.6 Database invariants and transactions

- Unique per-entity IDs and scoped foreign keys; no cross-workspace access.
- At most three active `Now` assignments per workspace; enforce **transactionally in database/server**, not just UI. (Implementation mechanism can be lock, serialized transaction, or equivalent.)
- Only one current focus per workspace, and it must reference an existing Now Outcome.
- No hard-block cycles; no cross-type references without validation.
- Idempotent writes for capture/research apply/sync.
- Status changes use optimistic concurrency or revision checks; return explicit conflict state when stale.
- Source Capture never removed by AI approval.
- Research result storage cannot alter authoritative Task/Decision/Focus state without a separately approved action.

---

## 17. Service boundaries and API contracts

### 17.1 Suggested modules (not mandatory framework choice)

- **Client UX:** responsive shared routes/components, local unsynced queue, form validation, accessibility.
- **Domain service:** CRUD, relationship validation, Focus transaction rules, progress computation.
- **Priority service:** deterministic ranking/explanations and suggestion diff, no automatic apply.
- **AI orchestration:** classification/research triage, schema validation, dedupe, prompt policy, rate/cost limits.
- **Research service:** source retrieval, citation normalization, risk policy, synthesis, persistence.
- **Auth and synchronization:** owner scoping, migration, revision checks and offline replay.
- **Audit/telemetry:** important user-approved mutations, research consumption, errors and performance (privacy-aware).

### 17.2 Representative API surface (adapt existing routes before inventing new ones)

| Endpoint/action | Method | Core rule |
| --- | --- | --- |
| `/captures` | `GET/POST` | Raw list and idempotent create; works without AI |
| `/captures/:id` | `PATCH` | Edit, independent complete/undo, archive, revision checks |
| `/ai-review/proposals` | `GET/POST` | Review recommendations, never authority by itself |
| `/ai-review/proposals/:id/apply` | `POST` | User approval, transaction, audit + undo metadata |
| `/workstreams`, `/outcomes`, `/tasks` | `GET/POST/PATCH` | Auth scope + domain integrity |
| `/decisions` and `/:id/resolve` | CRUD / `POST` | Explicit owner resolution |
| `/relationships` | CRUD | `blocks/informs/related` validation |
| `/focus/assignments` | `GET/PATCH` | Transactional max-three and explicit replacement |
| `/priority/recommendations` | `GET/POST` | Read-only deterministic suggestions unless separate apply |
| `/research/proposals` | `POST` | Scope/risk/consent preview |
| `/research/runs` | `POST/GET` | Authorized queued run; budget enforced |
| `/research/runs/:id/cancel` | `POST` | Best-effort cancellation, truthful status |
| `/research/runs/:id/findings` | `GET` | Claims, citations, provenance, freshness |
| `/search` | `GET` | Auth-scoped full-text/context |
| `/workspace/export`, `/workspace/import-preview`, `/workspace/import-commit` | `GET/POST` | Versioned backup, validated restore and confirmation |

API naming is illustrative; reuse existing backend conventions. All mutating endpoints require authenticated, authorized, CSRF-safe requests where applicable, idempotency on retries, schema validation and immutable audit where appropriate. All external AI/search calls must stay server-side.

### 17.3 Events and state propagation

On `CaptureSaved`, update Inbox and AI Review pending count, not Task completion. On `TaskCompleted`, update Outcome progress, Focus card and downstream readiness proposals; never automatically resolve Decisions. On `DecisionResolved`, recalculate related blockers only if approved verified relationships exist and **suggest** any Focus changes. On `ResearchReady`, notify context quietly, attach evidence and propose actions; never apply them. Cross-device clients receive fresh state without duplicate local mutations.

---

## 18. AI engineering contracts and evaluation

### 18.1 Model responsibilities

Models may: interpret text, propose classification, find relevant existing IDs from a bounded retrieval context, identify duplicate candidates, draft bounded next-action decompositions, triage research needs, summarize verified sources and explain priority suggestions. Models must **not** be authoritative for user preference, dates, completion, ownership, hard blockers or external action authorization.

### 18.2 Deterministic / AI boundary

Deterministic code owns statuses, approved priority assignments, deadline calculations, progress denominators, max-three invariants, eligibility filters, access checks and duplicate prevention. AI contributes candidate interpretations, evidence summaries and human-readable explanations. No model response should be written directly to core tables without validation and approval workflow.

### 18.3 Prompt, retrieval and output safety

Use typed schemas, fixed system-side instructions, limited workspace context, role-separated untrusted content, per-call limits, injection-resistant retrieval, and source grounding. Avoid leaking sensitive workspace details through telemetry, prompts, logs, or third-party tools without user consent. Record model/provider/version and validation errors for diagnosis while respecting privacy.

### 18.4 Quality evaluation sets

Maintain hand-curated test cases including: ambiguous capture; task vs Decision; duplicate SEO notes; false inferred blocker; incomplete research; conflicting government information; time-sensitive prices; incorrect source citation; prompt injection in webpage; long multiline brain dump; two identical requests; blocked Outcome with a feasible adjacent action; low-context recommendation; high-stakes personal question requiring explicit permission.

Measure precision of actionable suggestions, user correction rate, citation verification rate, hallucination rate, cost per successful useful answer and number of approvals required per useful structured outcome. Do not equate number of generated suggestions with product success.

---

## 19. Detailed design system and reusable components

### 19.1 Approved visual language

Premium, futuristic minimalist **light** interface: near-white canvas, crisp cool-gray 1px boundaries, subtle elevation, spacious layout, intentional typography and a unified cobalt/tech-indigo accent. Secondary text remains readable slate; not low-contrast gray. Resist generic SaaS dashboard cards, giant metric strips, thick borders, excessive gradients, decorative neon and unrelated accent colors. Respect the previously approved Exe desktop/mobile references; match existing approved token values from source before replacing them with guesses.

### 19.2 Semantic color

Cobalt/indigo for primary actions, selection, links and focus; red solely for genuine verified blocked/error; green restrained for completed/success; amber for genuine warnings; neutrals for metadata. Use icons/text along with color. Approved primary palette must not drift into green/teal branding.

### 19.3 Component inventory and exact behaviors

| Component | Must render | Interactions/states |
| --- | --- | --- |
| `AppShell` | desktop sidebar / mobile five-item dock | active route, accessible labels, safe-area, keyboard |
| `GlobalQuickCaptureButton` | separate cobalt plus above dock | opens sheet, always reachable, never masks nav |
| `QuickCaptureSheet` | textarea, Save/Cancel, sync status | multiline, keyboard-aware, no mandatory metadata |
| `InboxFilters` | All/Active/Done | accurate counts/filter persistence |
| `CaptureRow` | checkbox, raw text, subtle context | independent completion, edit, archive, undo |
| `AiProposalCard` | source + editable suggestions + rationale | approve/edit/defer/reject, no auto-write |
| `BatchReviewToolbar` | selected suggestions + changes preview | only eligible proposals, safe transaction |
| `WorkstreamList` | existing names/outcome counts | drill-down, no fabricated new workstreams |
| `OutcomeDetail` | success criteria, tasks, links, progress | edit, check, dependency inspect |
| `RelationshipChip/Edge` | kind, direction, verification | distinguishes blocks/informs/related |
| `DecisionQueueRow` | question, effect, status | open, sort by verified impact |
| `DecisionDetail` | options, evidence, rationale | record/reopen choice; research action |
| `MissionStatus` | current + 2 other active Outcomes | no top metrics, live counts |
| `CurrentPriorityCard` | progress, next action, context | Start Focus, task check, explain why |
| `FocusLaneManager` | Now/Next/Later | <=3 Now, replacement confirmation |
| `FocusMode` | one Outcome, next action, checklist | quick capture returns; low distraction |
| `PriorityRecommendation` | why, impact, what changes | Apply/Ignore/Defer; audit |
| `QuickAnswerCard` | short answer, sources, freshness | source open, feedback, optional approved follow-up |
| `ResearchProposal` | goal, scope, risk/cost and consent | edit/approve/dismiss |
| `ResearchProgress` | stage/status/cancel | recovery on reload, truthful failures |
| `ResearchFindingView` | supported claims + citations | compare, save, propose actions |
| `SearchOverlay` | scoped cross-entity results | keyboard/mobile, route to source |
| `WorkspaceSettings` | preferences, backup/restore, account | privacy and research controls |
| `ConfirmChangeDialog` | before/after and consequences | explicit approval for high-impact writes |
| `SyncStatusIndicator` | saved/pending/offline/conflict | never imply cloud save prematurely |

### 19.4 Mobile geometry and controls

Use ~44x44 CSS-pixel touch targets, at least 16px input text, readable body text, visible focus rings, WCAG AA contrast, safe-area insets, portrait/landscape behavior and layout tested at 320/375/390/430/768 widths. The frosted five-tab dock can use approximately `rgba(255,255,255,.82)` plus `blur(18px)` and subtle saturation/border/shadow, with near-opaque fallback where `backdrop-filter` is unsupported. This is a starting treatment; the approved visual reference remains authoritative. Never let the browser keyboard push the dock into overlapping controls.

### 19.5 Status and loading design

Prefer skeleton/loading states only when relevant, no fake progress animations. Checkboxes support unchecked, checked, pending save, error/rollback and disabled. Research cards support proposed, requires permission, queued, active, failed, ready and stale. Respect reduced motion; animation should communicate movement or causality, not distract.

### 19.6 Accessibility

Keyboard nav through all actions; semantic headings; proper checkbox labels; descriptive buttons; live-region announcements for saves, errors and research completion; logical focus movement in modal/sheet; escape and browser-back behavior; text resizing up to 200%; never communicate warnings by red alone; preserve focus context when Quick Capture closes.

---

## 20. End-to-end user journeys

### Journey A — first-run brain dump

1. New authenticated user sees empty Focus/Inbox with friendly non-fabricated instructions and optional sample explanation.
2. Tap global `+`; paste five independent thoughts.
3. Save once; each appropriate list line appears as a raw Capture with original provenance; capture remains usable while unsynced.
4. User checks an item from Inbox without visiting AI Review.
5. Background suggestion generation, if enabled, later offers classifications; user may ignore all suggestions.
6. After approval, structured work appears in Map, while originals remain searchable in Inbox.

**Success:** zero forced categorization and no data loss or silent Task completion.

### Journey B — clarify a factual question

1. Capture “Find out whether Acme must register in New York.”
2. AI Review flags Quick Answer candidate with explanation; auto public lookup only if explicit preference permits and sensitivity policy allows; legal implications likely require deliberate approval.
3. User authorizes scoped research; Exe retrieves official relevant guidance.
4. Result shows evidence, date, conditions and uncertainty without pretending it provides individualized legal advice.
5. User chooses to preserve evidence, create a follow-up Task, or close it; original Capture remains open unless user checks it.

**Success:** work reduced, source-verifiable result, no fabricated legal conclusion or auto-completion.

### Journey C — choose a launch market

1. A Decision “Determine first service area” is unresolved and linked to several Outcomes.
2. User opens Decisions and approves comparative Guided Research with specified candidate markets/criteria.
3. Exe gathers sources, contrasts evidence/assumptions, and shows results plus gaps.
4. User records an option and rationale.
5. Exe proposes reassessing affected tasks/blockers and Now lane, explicitly previewing changes.
6. User approves or rejects each consequential proposal.

**Success:** supported, reversible decisions and no silent global reprioritization.

### Journey D — prioritize under time constraints

1. Current Now Outcomes include two high-impact Outcomes and one medium-impact Outcome.
2. A high-impact Outcome is verified blocked; user has 20 minutes.
3. Immediate-action assistant suggests a feasible 20-minute task under another Outcome with a short why.
4. User completes the Task; Now lane stays unchanged unless user chooses otherwise.

**Success:** honest differentiation between importance and feasibility.

### Journey E — interruption in Focus Mode

1. User opens Focus Mode for current Outcome.
2. A new thought occurs; global `+` opens without losing Focus state.
3. User saves an item, sees saved/sync feedback, and returns to same task context.
4. New Capture is visible in Inbox and awaits optional AI review.

**Success:** capture does not derail execution.

### Journey F — blocked work becomes actionable

1. A user-confirmed `blocks` relationship connects unresolved Decision to Outcome.
2. Decision resolves; Exe recomputes readiness and surfaces one contextual suggestion.
3. User reviews downstream effect; approves replacement if the Now cap would be exceeded.
4. Focus Board and Map update consistently across devices.

**Success:** no false blocker, no four-item Now, no duplicate notification storm.

### Journey G — offline capture and sync

1. User captures on phone while disconnected; sees `Saved on this device — not synced`.
2. User returns online; queued write retries idempotently.
3. Server confirms; indicator changes to synced.
4. Desktop shows Capture once. If edits conflict, a deliberate reconciliation avoids data loss.

**Success:** durable and honest cross-device experience.

---

## 21. Non-functional requirements and security

### 21.1 Reliability

Capture should feel immediate: optimistically show local state but label remote sync truthfully. Offline queue must survive refresh/restart. Writes are idempotent. Research tasks recover after reload and reflect real server state. Avoid progress freezing and infinite spinners. Errors have retry paths and diagnostic identifiers.

### 21.2 Security and privacy

Server-side authentication and authorization for every row and endpoint, private workspace isolation, encrypted transport, secrets never shipped to client, secure cookies/session management, CSRF protection where applicable, rate limiting, validated imports, output encoding/XSS protection, URL allow-list or safe URL handling, prompt-injection defense, data minimization and deletion/export pathways. Audit AI-assisted mutations and research permission grants. No hidden external actions or automatic transmission of sensitive captures without scoped consent.

### 21.3 Scalability and performance

Use indexed owner/type/status/time lookups, pagination/virtualized long lists if necessary, debounced search, batching for AI review, bounded context retrieval, source-cache strategy with privacy isolation, queues for research, and event-driven UI updates. Avoid unnecessary AI requests on every keystroke or navigation.

### 21.4 Browser compatibility

Target current Safari (including real iPhone), Chrome desktop/Android, and major modern browsers. Test pointer/touch and keyboard, virtual keyboard resizing, viewport-safe dock, orientation changes, reduced motion, 200% zoom and no horizontal overflow. Public HTTPS staging preview required; `file://` prototype alone is not a release.

### 21.5 Analytics and data ethics

Log aggregate, privacy-minimized effectiveness metrics; do not transmit raw private Capture text merely for analytics. Provide user control for optional usage analytics and research telemetry where required. Instrument: time to capture and save; capture→useful action; review acceptance/edit/rejection; time spent reviewing vs executing; blocked duration; research answer usefulness/citation fidelity; Task/Outcome progression; sync failures; unnecessary repeat suggestions. Evaluate meaningful progression, not superficial time-in-app or daily streaks.

---

## 22. Error cases and recovery matrix

| Scenario | Required behavior |
| --- | --- |
| User closes Quick Capture with unsaved text | Confirm discard or preserve draft, never silently lose substantive content |
| Capture network request times out | Retain pending local entry; retry with idempotency key |
| Same multiline capture retried | No duplicate rows after sync |
| Two devices edit same Capture | Revision conflict resolution; preserve both versions or explicit choice |
| AI suggests nonexistent Outcome ID | Reject proposal and offer manual target selection |
| AI calls unrelated captures duplicates | User can reject; originals unchanged |
| AI proposes unverified `blocks` edge | Treat as proposal, not blocker |
| Dependency cycle attempted | Reject with specific validation explanation |
| Fourth Now Outcome requested | User must replace an existing Now Outcome in one transaction |
| Current focus deleted/archived | Clear invalid pointer, preserve history, prompt for replacement |
| A raw Capture is checked | Linked Task and Decision stay unchanged |
| Research finds no trustworthy source | Say unverified; give suggested follow-up; no invented citation |
| Sources conflict | Present disagreement and source dates, not false certainty |
| Research canceled mid-run | Mark canceled, retain authorized partial findings clearly labeled |
| Research quota exceeded | Explain limit; allow later/manual fallback, no hidden charge |
| User revokes research permission | Stop future auto runs; cancel pending where feasible and show controls |
| Retrieved page contains instructions to the AI | Ignore as untrusted source text; no tool/permission escalation |
| Restore file is corrupt or malicious | Reject safely without altering current workspace |
| Cross-workspace ID supplied to API | Return unauthorized/not found; never leak other workspace details |
| Mobile keyboard covers Save button | Sheet scrolls/resizes; Save reachable |
| AI unavailable | Manual Inbox/Map/Focus/Decisions continue working |

---

## 23. Acceptance criteria / testable definition of done

### 23.1 Existing locked V1 regression gates

- All existing raw Acme Captures import exactly, including 18 original entries where present. Preserve spelling, source and IDs; do not invent missing seed text.
- Inbox shows raw checklist with All/Active/Done and inline add immediately under heading.
- Check/uncheck/edit/archive/restore works across refresh; raw completion doesn't change linked Tasks or AI Review state.
- Mobile dock has five labeled destinations and separate visible floating `+`; no covered nav at 320/375/390/430px.
- Global Quick Capture from any route and Focus Mode returns to prior state; multiline preserved.
- AI Review approve/edit/defer/reject/batch suggestions are advisory; sources retained; undo traceable.
- Map reflects existing five Workstreams, relationships and task actions.
- Focus home shows one Current Priority plus at most two **Other active priorities**; Next/Later separate; accurate progress.
- Fourth Now assignment blocked pending explicit replacement; tested against concurrent writes.
- Verified `blocks` only; no fake deadline or done percentage.
- Desktop/mobile feature parity including Search, Settings and JSON backup/restore.
- Auth, cross-device sync, offline recovery, accessible mobile interaction and public HTTPS preview pass release gates before production claims.

### 23.2 New actionability and decision gates

- A vague Task can receive a **suggested** step breakdown but no Task is created without approval.
- The same blocked high-value Outcome can remain Now while an immediately actionable smaller Task is recommended.
- Decision Queue ranks verified meaningful impacts and shows evidence; resolving a Decision never silently changes Now.
- Explanation displays inputs and proposed changes; recommendations support Apply/Ignore/Defer and dedupe feedback.
- Research results attach to relevant work and do not count as completion by themselves.

### 23.3 New AI Research gates

- Opt-out user receives research **suggestions only**, no automatic outbound query containing capture text.
- Opted-in user can receive a bounded low-risk public Quick Answer; sensitive and deep research still require explicit run approval.
- Every factual answer that claims verification has real claim-supporting citations and retrieval date; no fake URL/source.
- No trustworthy source → honest inability to verify.
- Deep research run supports approve/edit scope, queued/running/ready/failed/canceled, reload recovery and quotas.
- Source prompt injection cannot change app state, expand permissions or execute instructions.
- Research-to-Task/Decision/Relationship/Now updates are **proposals** requiring owner confirmation.
- High-stakes or private context triggers elevated permission and uncertainty handling.
- Research invalidation/freshness and rerun consent are coherent.
- Result audit links each approved action back to original Capture, research run and approving user.

### 23.4 Cross-device, a11y and security gates

- Test mobile 320, 375, 390, 430, 768 CSS px and desktop 1024, 1280, 1440; no overflow/cropped controls.
- Real iOS Safari test with virtual keyboard open and closed; safe-area and capture sheet usable.
- WCAG AA contrast, focus order, labels, semantic warnings, reduced motion, 200% zoom.
- No client API credentials, authorization leaks, unvalidated AI writes, XSS on imported/raw/researched content.
- JSON backup round-trip and migration rollback confirmed.
- Automated unit/integration/E2E tests + manual screenshot comparison against approved visual references.

---

## 24. Build sequence — phased, reversible and test-driven

**Do not treat a long specification as permission to implement everything in one giant unreviewed PR.** Existing Exe may have an open Phase 1 PR. Inspect repository/branch state before touching code; do not merge or advance to Phase 2 without explicit authorization.

### Phase 0 — audit and freeze

Read repository instructions, existing specs and tests; identify actual branch/PR status, source files, schema, current UI, data migration path and baseline screenshots. Produce gap analysis mapping this document against existing behavior. Back up data. Add regression tests. **Deliverable:** verified inventory and scoped implementation plan. No speculative refactor.

### Phase 1 — preserve/finish approved foundation

Mobile five-tab parity; separate Quick Capture; raw Inbox checklist; correct independent Capture completion; approved Focus layout and accurate progress; Map and Decisions parity; responsive/a11y cleanup. Keep current scope and do not merge open work without owner approval. **Exit:** all locked V1 behavior tests pass.

### Phase 2 — production reliability and controlled intelligence

Authenticated persistence, cross-device sync, offline queue, backup/restore, schema validations, actual AI Review (not prototype heuristic mislabeled), selective batch approvals, audit/undo; deterministic Priority Engine and Now replacement transaction. **Exit:** source data preserved and safe on multiple devices.

### Phase 3 — execution intelligence

Actionable step suggestions in Focus Mode; strategic vs operational vs immediate action logic; Decision Queue impact links; context-aware adaptation and non-noisy review. **Exit:** evidence from real usage tests shows reduced organizing friction.

### Phase 4 — bounded research assistance

Source retrieval and claim citations; permission preferences; Quick Answer candidate→approval→result, authorized deep research queue, findings in existing screens, Decision support, freshness, cost guardrails and safe apply proposals. **Exit:** citation/hallucination/privacy tests and manual source audit pass.

### Phase 5 — optimization / hardening

Tune relevance/noise, monitor citation quality and suggestion correction rates, improve search, performance, security, accessibility and real-device regression; refine without adding unnecessary navigation or entity types. **Exit:** owner signoff on behavior and design.

**Per-PR requirements:** focused scope, requirements traceability, before/after screenshots (desktop and mobile), migration notes, automated test output, risks and rollback, explicit list of unimplemented items. Never label aspirational capability “complete” without proof.

---

## 25. Developer handoff operating instructions for Claude

1. **Inspect, don't assume.** Read `AGENTS.md`, `V1-LOCKED-SPEC.md`, `START-HERE.md`, existing UI/source/tests and any current PR. The latest actual code, not this document's examples, determines implementation inventory.
2. **Respect locked architecture.** Keep eight core entities and five nav destinations; no new “Projects/Agents/Research” permanent tab or substitute productivity methodology.
3. **Create a requirements matrix**: `Spec section → current implementation → gap → component/API → tests → phase`.
4. **Do not overwrite real data.** Preserve Acme workstreams, active priorities, original Captures and IDs. Record a migration/backup strategy before schema edits.
5. **Implement domain invariants server-side.** Especially three Now max, one current focus, Capture/Task completion independence, confirmed blockers, approvals.
6. **Keep AI advisory.** Model outputs are proposals/grounded findings, not automatic authority. Real AI/research must be backed by actual APIs and citation data.
7. **Keep UX restrained.** Match existing premium light design; prioritize first-viewport clarity and mobile Safari behavior. Never “improve” styling by inventing heavy dashboards or a new color system.
8. **Do not claim completion by visual imitation.** Demonstrate persistence, reliability, correct source grounding, no silent writes, and E2E tests.
9. **Build in scoped milestones.** Ask for authorization where repository workflow demands it, particularly merge/Phase 2 boundaries or structural changes.
10. **Report truthfully:** built, partially built, simulated, not built; exact tests run; blockers and decisions requiring user signoff.

### Suggested Claude kickoff instruction

> You are implementing Exe, an intelligent personal execution system. Treat the attached master specification and the repository's locked documents as authoritative. Do not redesign the core eight entities, five-destination navigation, Now cap or existing workflows. First inspect the repo and give me a factual implementation audit and staged plan, identifying any conflicts with current code. Do not merge an existing PR, overwrite user data, add permanent navigation, or start the next phase without explicit approval. For each approved phase, implement functioning components, server-side invariants, tests and mobile/desktop QA; show verified evidence and distinguish planned features from working ones.

---

## 26. Open implementation choices that do not override product decisions

The product behavior above is approved; certain technical mechanisms require codebase-informed selection, not arbitrary lock-in:

- Current repo may still be a vanilla HTML/CSS/JS localStorage prototype or may have evolved; choose maintainable componentization based on inspection.
- React + TypeScript with a deliberate Vite or Next.js choice, managed Postgres/auth (such as Supabase), and background research jobs are **suggested options**, not commands to discard working code.
- Capture multiline segmentation should align to existing raw Inbox behavior and preserve provenance.
- Priority tie-break implementation should be deterministic and explainable, calibrated with examples—not a secret AI score.
- Research provider/search engine, crawl access and pricing require actual integration verification. Show unsupported capability honestly.
- Scope research quota defaults after actual provider costs are known; strict caps apply in all cases.
- Design token values should be read from approved current code/references; token names and recommended CSS are not authorization to replace the visual identity.

Any issue requiring a genuinely new core entity, a changed user journey, a new nav tab, silent AI state mutation, or removal of an existing feature **must be escalated for explicit product approval** before implementation.

---

## 27. Definition of product success

The intended Exe experience is simple even if the underlying system is sophisticated. A user can open Exe when overwhelmed, capture everything without upfront organization, see trusted raw items, accept useful AI structure selectively, understand the real implications of decisions, receive an explanation of their top three active Outcomes, enter Focus Mode with a doable next step, and optionally have Exe **answer factual questions or conduct authorized research** that advances work. The user maintains control and trusts that nothing important disappears or changes mysteriously.

**Final litmus test:** After five minutes in Exe, does the user know what to do next, why it matters, and how to start—and has Exe reduced, rather than increased, the work required to reach that point?
