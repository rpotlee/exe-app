# Exe V1 — mobile-friendly handoff

This package contains **the current working prototype**, a **locked V1 functional and visual specification**, and **reference mockup images**. The prototype is NOT yet production ready.

## Contents
- `index.html`, `styles.css`, `app.js`: latest existing implementation baseline.
- `README.md`: project notes and run instructions.
- `V1-LOCKED-SPEC.md`: canonical requirements and acceptance tests, including unresolved functionality.
- **Design mockup images are not yet in the repository.** Use the approved image references from the Exe handoff package or ask for them before claiming screenshot/pixel-level parity. The written styling rules are in `V1-LOCKED-SPEC.md`.

## Instructions for Codex or an engineering agent
1. Read `V1-LOCKED-SPEC.md` **before** editing any file; treat it as authoritative. Preserve the specified product architecture, underlying entities, AI-approval boundaries and flows. No silent redesign.
2. Treat `index.html`, `styles.css`, and `app.js` at the repository root as the implementation baseline. Treat the mockups as styling/layout guidance, not proof that code exists or task progress is real.
3. Implement sequentially, with tests after each phase: (a) mobile/desktop visual parity and Inbox raw checklist; (b) AI Review and priority logic; (c) persistence/auth/sync; (d) mobile Safari, security, accessibility and deployment.
4. Do not fabricate task completion, deadline verification, user data, or AI feature availability. Secure all credentials server-side; do not place keys in frontend JS.
5. Send a short change list and screenshots after each stage for user review.

## Simplified first request for Codex
"Using this repository, read V1-LOCKED-SPEC.md and inspect index.html, styles.css, and app.js. First, make a comprehensive gap checklist against the spec and show me the proposed implementation sequence without changing code. Then implement Phase 1: the raw checkable Inbox, five-destination translucent mobile dock with persistent Quick Capture, and parity/spacing fixes. Preserve approved architecture and visual direction. Run responsive tests and provide actual desktop/mobile screenshots. Do not claim V1 is finished until release gates pass."

Keep repo private until deployment decisions are approved.