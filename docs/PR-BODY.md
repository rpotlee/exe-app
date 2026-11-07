Phase 1 gives Inbox raw editable/checkable captures and desktop/mobile capability parity. This final visual-conformance pass aligns the existing app with both approved mockups, preserving architecture, all eight entities, original data, independent completion, approval boundaries and the three-active-priority rule.

Changes:
- Consolidated visual values into `design-tokens.css` and readable component styles; retired the appended `phase1-refinement.css` overrides. Shared palette/type/spacing/radius/elevation/interaction/responsive tokens now cover all existing screens.
- Integrated the cobalt capture circle with the frosted dock: 64px circle emerges 26px through a 90px capsule; five labeled 56px-high navigation targets remain clear below it. Scroll content ends above the complete assembly.
- Calibrated Focus header/card/ring/secondary-priority geometry and depth. Restored actual thin progress tracks and sans percentage text. Desktop uses a 208px sidebar and 500px Focus column; mobile has readable titles, workstreams and actionable steps.
- Preserved the compact raw checklist, quiet overflow actions and visible filters. Inline Add is visually subordinate to global Capture. Original capture text, completion independence and archive/restore remain.
- Moved existing desktop Search to the sidebar; shortened status copy without changing its values or link. No event handler or workflow changes.

**[Full visual-conformance report: pre-code audit, target/result/discrepancy table, two visual passes, measurements, comparisons, all screenshots, tests and limitations](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/visual-conformance/REPORT.md)**

| Evidence | Link |
| --- | --- |
| Latest glass Focus: cropped reference vs actual | [Comparison](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/visual-conformance/comparisons/glass-focus-comparison.png) |
| Latest glass Inbox: cropped reference vs actual | [Comparison](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/visual-conformance/comparisons/glass-inbox-comparison.png) |
| Floating-capture Focus reference vs actual | [Comparison](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/visual-conformance/comparisons/floating-focus-comparison.png) |
| Desktop reference UI vs actual | [Comparison](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/visual-conformance/comparisons/floating-desktop-comparison.png) |
| Desktop Focus,1280 | [Actual screenshot](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/visual-conformance/pass-2/1280-focus.png) |
| Mobile Focus,390 | [Actual screenshot](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/visual-conformance/pass-2/390-focus.png) |
| Mobile Inbox,390 | [Actual screenshot](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/visual-conformance/pass-2/390-inbox.png) |
| Mobile Quick Capture,390 | [Actual screenshot](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/visual-conformance/pass-2/390-capture.png) |
| Complete floating dock/circle detail,390 | [Actual screenshot](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/visual-conformance/pass-2/390-dock.png) |

Verification, separately:
- Functional/responsive: baseline and all 320/375/390/430/768/1024/1280/1440 regression runs passed.
- Accessibility: 26 axe WCAG A/AA audits passed, plus direct non-text checkbox contrast, keyboard, safe-area and smaller/offset-viewport checks.
- Interactions/design contracts: context return, raw actions, state independence, minimum targets, shared tokens/unique CSS rules, selected navigation, progress geometry, focus/hover/pressed/disabled and native validation passed.
- Visual: two rendered inspection passes; Focus/Inbox at 320/375/390/430/1280/1440; four mobile capture/dock sizes; other screens; four comparisons against UI-only reference crops and measured differences.
- Syntax and whitespace checks passed. All screenshot progress is calculated from clean initial data, not copied from the mockups.

Necessary differences are documented: five functional labels instead of omitted mockup destinations, true 0% progress instead of fictional percentages, retained filters/settings, long original text and 320px wrapping, native font/icon rasterization, and approximate desktop calibration because devices occlude part of the reference.

Chromium emulation is **not real iPhone Safari**. Device keyboard/browser chrome, VoiceOver, zoom/orientation/background retention remain manual acceptance checks. No perfect-fidelity or full WCAG/device-compatibility claim.

**Stop for review. Do not merge, deploy, or begin Phase 2.**
