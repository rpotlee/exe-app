# Phase 1 validation results

- Before production changes: baseline passed at 390/1280px; five routes, all 18 original captures, three Now priorities, no completed seed tasks. Initial state backup and screenshots retained.
- Final baseline regression: passed at 390/1280px.
- Functional regression: passed at 320/375/390/430/768/1024/1280/1440px. Capture return from every route and Focus Mode, raw add/edit/complete/reopen/filter/archive/restore, persistence, original wording, review/task independence, Search/Settings, decision notes/resolve/reopen, five project workstreams, focus checklist expansion, three-Now guard, no horizontal overflow and separate mobile capture geometry.
- Accessibility: passed at 320/390/430/1280px; axe-core 4.14.0 returned zero WCAG A/AA violations for all five routes (20 route audits). Keyboard trapping, shortcuts, reduced motion and 420px-high capture sheets passed. Safe-area emulation (top 20px, bottom 34px) passed at all three mobile widths.
- Capture context regressions: passed at 320/390/430/1280px; unfinished Inbox text, scroll position, expanded mobile checklist and Focus Mode keyboard return preserved.
- `node --check app.js` and `git diff --check`: passed.
- Screenshots: real headless Chromium, clean example state, 390/1280px, before/after Focus and after Inbox. All structured tasks remain incomplete in screenshot data.

No real iPhone Safari/device keyboard, screen-reader session, cross-device sync or public deployment was tested. No pixel comparison against missing reference images is claimed. See PHASE-1.md for reproduction commands and scope.

## Final UI/UX refinement validation

All required documents and both approved WebP images were inspected before UI edits. Latest main (including approved references) was merged without conflict into the existing feature branch.

- Baseline: passed at 390/1280px.
- Existing functional suite: passed at **320/375/390/430/768/1024/1280/1440px**. Updated only the UI interaction needed to disclose row actions; behavioral assertions remain.
- Existing accessibility suite: passed keyboard/shortcuts, reduced motion, capture at 420px viewport height, safe-area 20/34px emulation at mobile sizes, and **20 axe WCAG A/AA route audits** at 320/390/430/1280px.
- New refinement suite: passed at **320/375/390/430/1280/1440px**, including long lists with unbroken descriptions, 16px Inbox text, collapsed/expanded controls, Escape and Enter, editing originals, independent completion, last-row control hit tests, scroll-region/capture/dock separation at three scroll positions, a 300px visual viewport with 20px offset, and **6 expanded-state axe audits**. Zero violations in the 26 audited route/states.
- Capture-context suite: passed at **320/390/430/1280px**, including unfinished drafts, scrolling the mobile content container, expanded checklists, Focus Mode scroll after save/cancel at 420px height, and return focus after rerendering.
- Syntax and whitespace checks: passed (`node --check app.js`, `git diff --check`).
- Final before/after screenshots and visual comparison against both approved references: [acceptance review](PHASE-1-ACCEPTANCE.md). No original capture text, structured task completion, approval logic, three-Now priorities or entity definitions were changed.

Remaining limitations: real iPhone Safari/keyboard/browser chrome, VoiceOver and real-device zoom/orientation/background retention are unverified. Automated viewport/safe-area tests do not replace those checks. No merge, deployment or Phase 2 work.
