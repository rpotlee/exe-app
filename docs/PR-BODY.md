The Inbox now opens to all raw captures as editable, checkable to-dos, with inline add, All/Active/Done filters, and reversible archive. Completion is independent of AI review and structured tasks; edits preserve original capture wording.

Mobile now exposes Focus, Inbox, AI Review, Map and Decisions in a frosted dock with a separate cobalt Quick Capture button. Search and workspace/backup settings are reachable on mobile and desktop. Capture returns to the previous route or Focus Mode. Focus labels and spacing are corrected; dialog keyboard behavior and secondary text contrast are improved.

This is Phase 1 only. Existing architecture, seed data, workflow and approval boundaries are preserved. No backend migration, live AI, sync, merge or deployment.

Validation: baseline workflow checks; eight-width Chromium functional regressions (320/375/390/430/768/1024/1280/1440); twenty axe WCAG A/AA route audits at four widths; keyboard focus/shortcuts, reduced motion, resized capture sheets and emulated safe areas; JavaScript syntax and diff checks. See [review notes and reproduction commands](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/PHASE-1.md).

Real Chromium screenshots from a clean example (all task progress remains zero):

| View | Before | After |
| --- | --- | --- |
| Desktop Focus | [Before](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/screenshots/before-desktop.png) | [After](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/screenshots/after-desktop-focus.png) |
| Mobile Focus | [Before](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/screenshots/before-mobile.png) | [After](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/screenshots/after-mobile-focus.png) |
| Desktop Inbox | — | [After](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/screenshots/after-desktop-inbox.png) |
| Mobile Inbox | — | [After](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/screenshots/after-mobile-inbox.png) |

Real iPhone Safari, actual virtual keyboard and assistive-technology checks remain manual; Chromium emulation does not establish those results. Approved reference images were unavailable, so pixel-level reference parity is not claimed.

<details><summary>Desktop and mobile screenshots</summary>

![Desktop Focus](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/screenshots/after-desktop-focus.png?raw=true)

![Mobile Inbox](https://github.com/rpotlee/exe-app/blob/feat/phase-1-inbox-mobile-parity/docs/screenshots/after-mobile-inbox.png?raw=true)

</details>
