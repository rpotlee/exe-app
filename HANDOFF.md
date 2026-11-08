# Exe — Handoff for the next developer or AI

Keep this file current. Update it in every commit that changes project state. Last updated: 2026-11-08 (see Progress log).

## Read first, in this order
1. `DECISIONS.md` — owner-approved and owner-delegated product decisions (DEC-001 to DEC-004), each with rationale.
2. `EXE_MASTER_PRODUCT_AND_BUILD_SPEC.md` — **governing product spec**. The owner says earlier specs are outdated (DEC-004).
3. `AGENTS.md` — process rules (feature branch, tests, real screenshots, PR per phase).
4. `PRODUCT-BLUEPRINT.md` — reconstructed inventory of the current code and the gap register (§9). Gaps resolved by DEC-001 to DEC-004 are listed there as open; treat DECISIONS.md as newer.
5. `V1-LOCKED-SPEC.md` — older. Do not edit. Master spec wins on conflict.

## State
- Branch: `feat/phase-1b-mockup-fidelity` (separate from PR #1's branch `feat/phase-1-inbox-mobile-parity`, which has diverged; reconcile after Phase 1). Pushed to origin after every commit.
- App is still the vanilla HTML/CSS/JS localStorage prototype. Not a deployed or AI-backed app.
- Untracked, unknown origin, never commit: `assets/diagonal-paint.png`, `assets/white-paint.png`, `assets/yellow-paint.jpg`.
- Running tests on a Mac: `python3 -m venv v && v/bin/pip install playwright`, serve with `python3 -m http.server 8000 --bind 127.0.0.1`, and set `EXE_CHROMIUM` to a Chrome/Chromium binary (tests default to `/usr/bin/chromium`).

## Owner permissions (stated in chat, 2026-11-08)
- Commit and push to feature branches after every commit, without asking.
- Still ask first for: merging to `main`, force-pushing, deploying, major visual changes (AGENTS.md).

## Build order (Phase 1) and status
1. Next & Later screen (DEC-003): **done**.
2. Status line and Inbox badge (DEC-003): **done**.
3. Five labeled tabs + separate "+" (DEC-004): **done**.
4. Priority Engine suggestions card (DEC-003): **done**.
5. Relationship as single authority, `CAPTURE_TASKS` removed: **done** (migration in `migrate()`).
6. Decision fields (evidence, chosen option, log): **done**. Outcome completion flow, Task edit: see Progress log.
7. Tests, screenshots, `docs/REQUIREMENTS-MATRIX.md`, PR: see Progress log.
Not in the owner's Phase 1 order and not built: AI Review actions per DEC-002 (reject, merge, defer rules), empty start for regular users (DEC-002), folders (DEC-001), search over ideas/folders, dark theme removal.

## Rules that must hold
Eight entities only; five tabs; max three Now outcomes; AI suggests, never silently changes; light theme only; never fabricate progress; the prototype is not a deployed AI app.

## Progress log
- 2026-11-08: decisions DEC-001 to DEC-004 logged. No feature code yet.
- 2026-11-08: Phase 1 items 1-5 and decision fields built and pushed (Next & Later screen, status line, Inbox badge, labeled dock + separate "+", Priority Engine card, Relationship authority with cycle checks, decision evidence/chosen option/log, outcome pin/deadline/effort). DEC-005 logged. Existing tests repaired for phones (collapsed pickers, overflow at 768px). Remaining: outcome completion flow, task edit, new tests, screenshots, requirements matrix.
