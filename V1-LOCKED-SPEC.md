# Exe V1 — Locked Product Architecture, Design Spec, Implementation Plan and Acceptance Criteria

**Status:** Implementation handoff / specification. **Not evidence that the work is implemented.**
**Baseline source in this repository:** root `index.html`, `styles.css`, `app.js` (extracted from Exe Mission Status V2). The prior standalone `Exe-Mission-Status-Interactive.html` is a historical artifact, not a separate codebase.
**Visual references stored in this repository:** `assets/design-reference/approved-floating-capture-and-inbox.webp` and `assets/design-reference/approved-light-glass-navigation.webp`; see `assets/design-reference/README.md` for precedence. These establish Mission Status, the raw Inbox, the global floating Quick Capture, five functional destinations, and subtle glass navigation. Any inaccurate mockup counts or missing drawn controls are illustrative only; locked features and real application state take precedence.

## 0. Non-negotiable change control
- The previously approved business logic, entities, project structure, and flows are locked. Do not replace or reimagine the application, or silently add a new product methodology.
- Core entities remain **Capture, Workstream, Outcome, Task, Decision, Idea, Relationship, FocusAssignment**. Existing workstreams, the three approved Acme Now priorities, statuses and relationships must survive the migration.
- Preserve the workflow: **Capture -> AI Review -> Project Map/Decision Queue -> explainable Priority Engine -> Now/Next/Later Focus Board -> Focus Mode -> adapt/review**.
- The user requested one additive Inbox behavior: original Captures also function as a raw checklist. Support an independent completion flag on the existing Capture entity. Completion of a raw Capture does NOT silently mark an underlying structured Task as completed, nor does AI classification itself signify completion.
- AI suggestions are advisory; no silent merges, deletion, reclassification, dependency creation, task completion or priority promotion.
- This must be a **mobile-browser-first web app**, not a required native mobile app. Desktop and mobile have equivalent capability, even when composition differs.

## 1. Existing prototype audit (verified in source and Chromium viewport test)
1. Inbox renders capture history and review badges, not a raw checkable list; there are **zero checklist checkboxes in Inbox**.
2. The mobile dock currently exposes Focus, Inbox, Map and Decisions; AI Review is only reachable indirectly by a top bell or text link. Desktop sidebar has an explicit AI Review item.
3. Mobile search and workspace/settings/JSON import-export access are not exposed, unlike desktop.
4. The floating Quick Capture plus currently occupies the dock's center position instead of being a separate prominent action slightly above the five-destination dock.
5. Current dock CSS is `rgba(255,255,255,.97)`; its blur is visually minimized by near-opacity.
6. Mission Status says `1 priority in focus` as hardcoded text; the review count is dynamic. Other active Now outcomes are incorrectly titled `Next priorities`.
7. Current 18 raw Acme entries have been pre-marked `organized` in seed data, and the two SEO inputs have not been semantically consolidated. No true live AI is connected.
8. Now/Next/Later are manually controlled; there is no full explainable Priority Engine, deadline validation or readiness-based recommendation process.
9. LocalStorage data and JSON export/import are device-local; no authentication, backend, mobile/desktop sync, or production HTTPS deployment.
10. The visual code contains duplicate `pageHeading` definitions, legacy unused metric styles and stacked overrides. This is technical debt; refactor organization, not intended UX.
11. Existing browser tests cover a few Chromium viewports and workflows, not Safari on a real iPhone or cross-device synchronization.
12. Extra Focus panels repeat Next information and Quick Capture guidance. On mobile, a hardcoded `margin-top:145px` creates unnecessary white space before them.

## 2. V1 information architecture and navigation (unchanged module structure)
- Five destinations, on desktop sidebar and mobile floating dock: **Focus, Inbox, AI Review, Map, Decisions**.
- **Quick Capture** is a separate global circular cobalt +, visually elevated just above the mobile dock and one click away from all five destinations. On desktop use a single global quick-capture control/shortcut.
- Focus Mode remains a contextual action, **not** a sixth permanent nav destination.
- Priority Engine remains an in-context intelligence capability, **not** a permanent nav destination.
- Search and Settings/Workspace must be available on both desktop and mobile, accessible from an unobtrusive mobile header/overflow/account menu. Maintain JSON backup and restore until reliable cloud sync is fully validated.
- All nav controls should have text labels, active states and accessible names. Desktop and mobile use the same route/state model; no mobile placeholder-only pages.

## 3. Screen contracts

### Focus / Mission Status
- Compact `Mission Status` heading and live state line; **no top row of metrics, no oversized greeting**.
- One current priority card with accurately computed progress, checklist steps, progress feedback and Enter Focus Mode.
- Two other currently active priorities in compact rows. Label **Other active priorities** (not Next, since both are in Now).
- Now capped at three FocusAssignments; user must approve replacement before assigning a fourth.
- A genuinely separate Next/Later management interface, accessible without redundant panels cluttering the initial viewport.
- Red blocked state only for verified actual blockers. Include accessible warning labels/icons, not color alone. If desired, compact blocked count in Mission Status line; do not restore a dashboard metric row.
- Never pre-mark business steps completed or invent actual progress numbers. Mockup values are illustrative only.

### Inbox — RAW checklist first
- First content below title: filters `All / Active / Done`, inline `Add a to-do...`, then the raw checklist rows.
- All original Captures remain immediately visible as raw text, regardless of AI Review classification status; retain original wording, timestamps and provenance.
- Each row has an independently functional check/uncheck (Capture completion), proper strike-through/completion confirmation, and safe edit/archive/undo controls. Do not erase original entries when organized.
- New raw to-dos can be added inline, and are added as Capture records. The global Quick Capture remains available for uninterrupted, free-form, multiline brain dumps.
- AI review pending count available as a quiet action/notification, not a full-page gate to seeing the list.
- The user can complete raw list items even if not yet reviewed; AI review status and completion status are separate dimensions.
- Empty state, sorting, persistence and keyboard interaction on desktop and mobile.

### AI Review
- Clearly labeled and one-tap accessible from mobile bottom dock, with accurate pending badge.
- Original capture displayed alongside editable suggested type, target workstream, possible existing outcome, duplicate/related capture proposals, dependency kind (`blocks`, `informs`, `related`), and short explanation.
- Review actions: approve, edit and approve, defer, selective batch approve. Never auto-apply a duplicate merge or modify the Focus Board.
- True AI classification/deduplication, if deployed, must run server-side with schema-validated responses; gracefully degrade to manual review if unavailable. Prototype keyword rules must never be described as live AI.
- Approved proposal preserves original Capture and links it to target work. Keep traceability and undo/audit history.

### Project Map
- Preserve five original Acme workstreams and their existing outcomes, tasks, decisions, ideas and relationships.
- Allow outcome drill-down, checklist actions, relationship visibility, and task create/edit/complete.
- Distinguish hard `blocks` from weaker `informs` or `related` suggestions; unconfirmed AI relationships are not real blockers.
- Mobile uses readable list/drill-down, not cramped graph. Desktop may use a more information-rich hierarchy.

### Decisions
- Preserve decision options, notes, evidence, conclusion and unresolved/resolved status.
- Mobile presents a readable single decision detail with accessible navigation between decisions, preserving all desktop actions.
- Resolving a decision suggests affected work for review; never silently moves priorities.

### Priority Engine / Now-Next-Later
- Explainable, deterministic recommendation core using objective relevance, verified deadlines, dependency impact, readiness, effort and explicit user overrides. Avoid synthetic 0-100 scores and fabricated due dates.
- AI may help describe or surface relationships but cannot set authoritative priorities without user approval.
- Support blocked states independent from Done and Now/Next/Later.
- Explain why suggested and which downstream work is unlocked; include explicit Apply/Ignore/Defer.

### Focus Mode
- Low-distraction view of one current priority and action checklist, with captured interruptions handled via global Quick Capture.
- After saving/closing Quick Capture, return to the same Focus Mode context; preserve work state.
- Completion updates all linked progress indicators consistently across devices.

## 4. Visual design system — approved clean futuristic light
- Signature accent: single cobalt/indigo family across nav, buttons, selected tabs, progress and links. Do not introduce an unrelated green/teal brand color.
- Canvas: clean near-white; ink: high-contrast charcoal; secondary copy: readable slate, never faint gray-on-white.
- Cards: sharp 1px cool-gray hairline or faint inset border, restrained shadow, gentle surface layering and consistent corner radii. Deliberate grouping and spacing, not a sea of nested boxes.
- Remove redundant large descriptions, duplicated Quick Capture prompts and repeated secondary panels where they do not provide distinct actionable value. Preserve access to features.
- Buttons and checkboxes: clear hover, active, focus-visible, loading, success/error and disabled states. Reduced motion respected. No neon or flashing effects.
- Semantic red for verified Blocked; green only for completed/success, amber for genuine warnings. Icons plus text must convey status.
- Mobile typography: no important text so small it harms readability; inputs should be at least 16px to prevent iOS Safari focus zoom; high contrast and comfortable touch controls (target ~44x44 CSS pixels).

### Exact mobile floating dock treatment
- Five equally understandable labeled nav destinations: Focus, Inbox, AI Review, Map, Decisions.
- Separate circular cobalt + button **slightly elevated** from the dock; do not allow it to obscure the middle destination. Confirm geometry at 320, 375, 390 and 430px widths.
- Delicate frosted-glass effect: suggest CSS `background: rgba(255,255,255,.82); backdrop-filter: blur(18px) saturate(1.2); -webkit-backdrop-filter: blur(18px) saturate(1.2); border:1px solid rgba(208,216,232,.85); box-shadow:0 10px 30px rgba(28,42,89,.11), inset 0 1px 0 rgba(255,255,255,.8);`.
- Include a near-opaque fallback when `backdrop-filter` is unavailable; verify contrast over scrolled content. Use safe-area insets and padding to prevent content overlap. Avoid stacked glass panels or large bloom.
- Dock should not jump when the keyboard opens; capture sheet must remain usable with the virtual keyboard shown.

## 5. Data contracts and minimal additive change
- Core object names and associations remain frozen. Preserve current entity IDs and existing user choices whenever migrating.
- Add only the minimal Capture completion metadata necessary for the explicitly requested raw checklist (`completedAt` nullable, derivable `isCompleted`) and references/audit metadata needed for traceability. Never equate `Capture.status = organized` with `Capture.completedAt != null`.
- Preserve user-declared blockers and distinguish them from AI suggestions.
- On source migration, import all 18 original Acme lines and honor approved three priority outcomes: `Confirm New York business registration`, `Determine first service area`, `Define Backend V1`. Do not mark historical tasks completed unless explicitly recorded by the user.
- Consolidating SEO duplicate proposals requires approval and cannot delete either source capture.

## 6. Production engineering required before V1 release
- Current prototype is vanilla single-page HTML/CSS/JS with localStorage. Refactor into maintainable, testable components/modules *without changing the approved behavior*; TypeScript recommended.
- For a responsive web app, suggested implementation stack: React + TypeScript (Vite or Next.js, choose one deliberately), managed Postgres + auth (e.g. Supabase), a secure server-side AI review endpoint, and HTTPS hosting. These are engineering choices, not new product entities.
- Implement authenticated personal workspace data, secure database access policies (row-level security or equivalent), server-side secrets, account recovery, versioned migrations, idempotent writes and cross-device synchronization. Confirm backup restore before deprecating local-only backups.
- Handle slow/offline connections without silent data loss: capture locally when necessary, clearly show unsynced state, retry safely, and resolve conflicts predictably. Never label unsaved work as synced.
- Validate imports and AI JSON schema; prevent XSS/injection; enforce authorization at API/database, rate limiting, logging/monitoring and error recovery. No tokens or credentials in browser source.
- Mobile web requirements: iOS Safari and Android Chrome, viewport safe areas, virtual keyboard, scrolling, 200% zoom, reduced motion, good tap targets, real-device screenshots, touch/keyboard accessibility. PWA install may be optional; a browser URL is required.
- Support a simple first-run empty workspace and importing the Acme seed without presenting example data as true current completion.

## 7. Automated and manual acceptance tests / RELEASE GATES
1. Import/capture the exact 18 original Acme entries, see all 18 immediately in Inbox, and preserve them verbatim.
2. Add new raw item inline; check, uncheck, edit, archive/undo; refresh and confirm the same state.
3. Mark a raw capture Done; verify AI review state and linked structured task completion do not change without user action.
4. Save multiline Quick Capture from any tab and from Focus Mode; return to previous context; each line appears in Inbox.
5. AI Review proposes classifications and identifies overlapping SEO entries; no auto merge, no silent priority shift. User can edit/reject/approve; originals remain available.
6. Project Map shows expected workstreams, outcomes, task links, and three relationship kinds; decision history persists.
7. Focus Board has exactly three approved current Now priorities by default. Attempt fourth: replacement confirmation appears; never four Now items.
8. Progress rings and counter values match actual data; no example percentages displayed as real.
9. Mission Status accurately says 1 current focus out of up to 3 active, with dynamic AI review and verified blocked count when relevant. Label other Now items as **Other active priorities**.
10. Open all **five** mobile dock destinations with one tap; the global + remains visible and does not cover any destination.
11. Mobile includes the same Search, Settings/Account, backup/restore and decision/task actions as desktop, in mobile-appropriate presentation.
12. Mobile views verified at 320, 375, 390, 430, 768 CSS px; desktop at 1024, 1280, 1440; no horizontal overflow, cut-off content or dock overlap.
13. iOS Safari real device checks: keyboard-visible Quick Capture, orientation, scrolling, safe area, browser chrome, background/foreground retention.
14. Meaningful progress persists across sign-in on both desktop and mobile; offline captures sync without duplication.
15. Formal accessibility checks (focus-visible, labels, status not color-only, WCAG AA text contrast, tap targets, reduced-motion), browser regression and error monitoring.
16. Security test: client source contains no API keys, workspaces cannot access one another, AI request validation, rejected malformed backup, basic XSS checks.
17. Visual screenshot comparison against approved light desktop/mobile reference; no dark/green aesthetic, no metrics row, minimal depth and subtly frosted navigation.
18. Confirm all important features functional in a **public HTTPS test deployment**, not just `file://` HTML. No release until critical/major issues fixed.

## 8. Build sequence / guardrails for Codex
- Step 1: Add tests for existing behavior; snapshot current state and make verified data backup. Create a source-controlled repository and `AGENTS.md` reflecting this document. No production code changes until baseline tests pass.
- Step 2: Fix navigation/accessibility/composition parity and frosted dock, with screenshot comparison. Keep all current workflows.
- Step 3: Implement raw Inbox checklist and Capture completion while preserving AI Review and task statuses.
- Step 4: Complete missing AI Review + explainable Priority Engine behavior with approval gates.
- Step 5: Implement authenticated persistence, cross-device sync, graceful offline/error handling; migrate data safely.
- Step 6: Full E2E tests, Safari/mobile QA, accessibility, security review, HTTPS preview and final signoff.
- One scoped pull request per phase, with before/after screenshots and test output. Never silently change locked architecture. Block the release if tests fail.

## 9. Intended V1 outcome
User opens Exe on laptop or phone, sees Mission Status, moves instantly to a **raw checkable Inbox**, captures new thoughts globally, selectively approves intelligent organization, understands workstream/outcome/decision relationships, receives explainable priority recommendations, and acts on up to three Now priorities without losing information or context. Every meaningful change persists securely across devices.