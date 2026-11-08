# Exe — Handoff for the next developer or AI

Keep this file current. Update it in every commit that changes project state. Last updated: 2026-11-08.

## Read first, in this order
1. `DECISIONS.md` — owner-approved and owner-delegated product decisions (DEC-001 to DEC-004), each with rationale.
2. `EXE_MASTER_PRODUCT_AND_BUILD_SPEC.md` — **governing product spec**. The owner says earlier specs are outdated (DEC-004).
3. `AGENTS.md` — process rules (feature branch, tests, real screenshots, PR per phase).
4. `PRODUCT-BLUEPRINT.md` — reconstructed inventory of the current code and the gap register (§9). Gaps resolved by DEC-001 to DEC-004 are listed there as open; treat DECISIONS.md as newer.
5. `V1-LOCKED-SPEC.md` — older. Do not edit. Master spec wins on conflict.

## State
- Branch: `feat/phase-1b-mockup-fidelity` (separate from PR #1's branch `feat/phase-1-inbox-mobile-parity`, which has diverged; reconcile after Phase 1).
- Product decisions are done for Phase 1. No code was changed in the decision walkthrough; the app is still the vanilla HTML/CSS/JS prototype.
- Untracked, unknown origin, never commit: `assets/diagonal-paint.png`, `assets/white-paint.png`, `assets/yellow-paint.jpg`.

## Owner permissions (stated in chat, 2026-11-08)
- May commit and push to GitHub on feature branches at any sensible point, without asking.
- Still ask first for: merging to `main`, force-pushing, deploying, major visual changes (AGENTS.md).

## Build order (Phase 1, master spec §24)
1. Restore the Next & Later screen (R-01, DEC-003).
2. Status line and Inbox badge per DEC-003 (badge = items awaiting AI Review; no "blocked" badge).
3. Five labeled tabs + separate floating "+" (DEC-004); remove the icon-only dock.
4. AI Review actions per DEC-002 (defer, reject, merge, no silent "Unsorted work").
5. Priority Engine suggestions card per DEC-003 (suggestion only, rule order, Apply/Ignore/Defer).
6. Dependencies: Relationship entity as the single authority; remove hard-coded `CAPTURE_TASKS`.
7. Decision fields (evidence, chosen option, log), outcome completion flow, Task edit.
8. Tests, real screenshots at 320/375/390/430/768 and desktop, then a PR.

## Rules that must hold
Eight entities only; five tabs; max three Now outcomes; AI suggests, never silently changes; light theme only; never fabricate progress; the prototype is not a deployed AI app.

## Progress log
- 2026-11-08: decisions DEC-001 to DEC-004 logged. No feature code yet.
