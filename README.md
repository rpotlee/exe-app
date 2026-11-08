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

**Approved design references:** see [`assets/design-reference/`](assets/design-reference/README.md), which now contains the actual full-resolution mockups. Use both images during desktop/mobile visual comparison, with [`V1-LOCKED-SPEC.md`](V1-LOCKED-SPEC.md) authoritative for functionality and architecture.

## Two apps live in this repository (2026-11-08)
- **The new app (`web/`, React + TypeScript + Vite).** Sign-in, a real Supabase database, offline saving, search, backup restore, bring-your-own-key AI. Run it with `npm install`, copy `.env.example` to `.env`, then `npm run dev` (add `?local=1` to run on one device without an account). Build with `npm run build` (output in `dist/`).
- **The prototype (`index.html`, `app.js`, `exe-ui.css`).** The original browser-only version. Kept so its tests and screenshots still run; the new app imports its exported backups.
- **Database:** `supabase/` (see `supabase/README.md`). Rules live in the database, with tests: `npm run test:db`.
- **All automated checks:** `npm test` (typecheck, unit tests including runs against the real schema, database tests). Browser tests need Playwright: `tests/app_react.py` (new app) and the older `tests/*.py` (prototype).
- **Decisions and status:** `DECISIONS.md`, `HANDOFF.md`, `docs/REQUIREMENTS-MATRIX.md`.

