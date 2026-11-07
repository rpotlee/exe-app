# Exe — Personal Execution System

**Status: V1 implementation baseline — not production-ready.**

This repository contains the existing Exe browser prototype and the locked V1 product specification. It has not yet been connected to a database, real AI service, or mobile/desktop synchronization.

## Run the prototype

Open `index.html` in a browser, or use a small static development server for local testing. The current build stores data only in browser local storage. Do not use it for critical information until persistent storage and backups are verified.

## Files
- `index.html`, `styles.css`, `app.js`: extracted from the previously built self-contained Exe Mission Status V2 prototype without intentional workflow changes.
- `V1-LOCKED-SPEC.md`: authoritative functional, architecture, design, and acceptance criteria.
- `START-HERE.md`: engineering handoff and proposed Codex stages.
- `AGENTS.md`: development guardrails.

## First Codex task

Read `AGENTS.md` and `V1-LOCKED-SPEC.md`. Inspect the baseline, produce a gap analysis, then work in a branch and open a pull request for **Phase 1 only** (mobile/desktop navigation, the raw checkable Inbox, Quick Capture, and layout parity). Do not replace existing models or workflows. Show before/after real browser screenshots and tests.

**Design references:** the user approved a light, cobalt-accented visual direction with subtle translucent mobile dock and an elevated global capture button. Exact visual-reference images are preserved in the original Exe V1 handoff ZIP; request them for pixel-level comparisons rather than inventing a new look.
