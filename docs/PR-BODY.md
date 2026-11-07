Phase 1 makes the Inbox a raw, editable checklist and brings desktop/mobile navigation and capability into parity. This final refinement uses both approved design references now merged from `main`, preserving the existing vanilla app, all eight entities, original captures, independent completion, priority logic and approval boundaries.

Changes:
- Compact, divider-based Inbox rows with 16px task text; accessible ellipsis disclosures contain Edit, Archive/Restore, provenance and review status. All/Active/Done and inline Add remain visible.
- Five labeled destinations in a subtle glass dock, with a distinct centered cobalt + above it. A reserved mobile scroll region prevents either floating control from covering content or row actions.
- Dominant current Focus card, two subordinate active priorities, quieter Next/Later entry into the existing management dialog. Removed repeated Next items and redundant capture prompts.
- Refined geometry, typography, borders and depth; readable secondary text, consistent utility icons, visible keyboard focus and reduced-motion support.
- Capture preserves route, unfinished Inbox input, expanded rows/checklists and scroll, including Focus Mode after save/cancel. Modal geometry follows VisualViewport height/offset for keyboard layout handling.

Validation:
- Existing baseline and eight-width functional regressions passed: 320/375/390/430/768/1024/1280/1440.
- New long-list, wrapping, overflow/disclosure, hit-target and floating-control clearance tests passed at 320/375/390/430/1280/1440.
- 26 axe WCAG A/AA route/state audits passed, including expanded metadata/actions. Keyboard, reduced motion, emulated safe areas, reduced/offset visual viewport and capture-context checks passed.
- JavaScript syntax and diff checks passed. Screenshots use real Chromium rendering of clean example data with zero completed tasks.

[Visual comparison against both approved images, acceptance notes and reproduction links](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/PHASE-1-ACCEPTANCE.md) · [Test results](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/TEST-RESULTS.md)

| Screen | Before final refinement | After |
| --- | --- | --- |
| Desktop Focus, 1280px | [Before](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/screenshots/refinement/before-1280-focus-full.png) | [After](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/screenshots/refinement/after-1280-focus-full.png) |
| Mobile Focus, 390px | [Before](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/screenshots/refinement/before-390-focus.png) | [After](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/screenshots/refinement/after-390-focus.png) |
| Mobile Inbox, 390px | [Before](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/screenshots/refinement/before-390-inbox.png) | [After](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/screenshots/refinement/after-390-inbox.png) |

Real iPhone Safari, the actual virtual keyboard/browser chrome, VoiceOver and device zoom/orientation/background retention still need manual acceptance. Emulation and axe do not establish full device or WCAG conformance. Approved mockup progress is illustrative and was not copied into user data.

**Phase 1 only. Stop for review: do not merge, deploy or start Phase 2.**
