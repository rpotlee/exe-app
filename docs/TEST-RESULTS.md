# Phase 1 validation results

- Before production changes: baseline passed at 390/1280px; five routes, all 18 original captures, three Now priorities, no completed seed tasks. Initial state backup and screenshots retained.
- Final baseline regression: passed at 390/1280px.
- Functional regression: passed at 320/375/390/430/768/1024/1280/1440px. Capture return from every route and Focus Mode, raw add/edit/complete/reopen/filter/archive/restore, persistence, original wording, review/task independence, Search/Settings, decision notes/resolve/reopen, five project workstreams, focus checklist expansion, three-Now guard, no horizontal overflow and separate mobile capture geometry.
- Accessibility: passed at 320/390/430/1280px; axe-core 4.14.0 returned zero WCAG A/AA violations for all five routes (20 route audits). Keyboard trapping, shortcuts, reduced motion and 420px-high capture sheets passed. Safe-area emulation (top 20px, bottom 34px) passed at all three mobile widths.
- Capture context regressions: passed at 320/390/430/1280px; unfinished Inbox text, scroll position, expanded mobile checklist and Focus Mode keyboard return preserved.
- `node --check app.js` and `git diff --check`: passed.
- Screenshots: real headless Chromium, clean example state, 390/1280px, before/after Focus and after Inbox. All structured tasks remain incomplete in screenshot data.

No real iPhone Safari/device keyboard, screen-reader session, cross-device sync or public deployment was tested. No pixel comparison against missing reference images is claimed. See PHASE-1.md for reproduction commands and scope.
