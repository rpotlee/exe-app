# Exe V1 — mobile-friendly handoff

This package contains **the current working prototype**, a **locked V1 functional and visual specification**, and **reference mockup images**. The prototype is NOT yet production ready.

## Contents
- `source/index.html`, `source/styles.css`, `source/app.js`: latest existing implementation baseline.
- `source/README.md`: source notes.
- `V1-LOCKED-SPEC.md`: canonical requirements and acceptance tests, including unresolved functionality.
- `design-references/approved-light-glass-navigation.png`: latest visually approved light design direction with translucent bottom dock.
- `design-references/approved-floating-capture-and-inbox.png`: previous illustration establishing persistent + capture action and raw inbox.

## Instructions for Codex or an engineering agent
1. Read `V1-LOCKED-SPEC.md` **before** editing any file; treat it as authoritative. Preserve the specified product architecture, underlying entities, AI-approval boundaries and flows. No silent redesign.
2. Treat `source/` as the implementation baseline. Treat the mockups as styling/layout guidance, not proof that code exists or task progress is real.
3. Implement sequentially, with tests after each phase: (a) mobile/desktop visual parity and Inbox raw checklist; (b) AI Review and priority logic; (c) persistence/auth/sync; (d) mobile Safari, security, accessibility and deployment.
4. Do not fabricate task completion, deadline verification, user data, or AI feature availability. Secure all credentials server-side; do not place keys in frontend JS.
5. Send a short change list and screenshots after each stage for user review.

## Simplified first request for Codex
"Using this repository, read V1-LOCKED-SPEC.md and inspect source/. First, make a comprehensive gap checklist against the spec and show me the proposed implementation sequence without changing code. Then implement Phase 1: the raw checkable Inbox, five-destination translucent mobile dock with persistent Quick Capture, and parity/spacing fixes. Preserve approved architecture and visual direction. Run responsive tests and provide actual desktop/mobile screenshots. Do not claim V1 is finished until release gates pass."

Keep repo private until deployment decisions are approved.