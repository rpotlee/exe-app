# Exe — Mobile Browser Layout Audit

**Date:** 2026-11-08 · **Scope:** mobile browser layout and behavior (iPhone Safari first). See "Implementation status" at the end.

## How this was done, and its limits

Measured in a Chromium preview at 320×568, 375×667, 390×844, 430×932 and 844×390 (landscape). Code read: `index.html`, `exe-ui.css`, `styles.css`, `design-tokens.css`, `app.js`. Your iPhone screenshots were used for real Safari rendering.

**Not verified:** behavior on a real iPhone beyond the screenshots you sent (keyboard, toolbar collapse, home-screen mode, scroll performance); Android Chrome; iPad. Statements about Safari/WebKit internals below are from known platform behavior, not from testing your device, and are marked **(verify)**.

---

## What already works (keep)

- `viewport` meta includes `viewport-fit=cover`; pinch-zoom is **not** disabled.
- The dock's position includes `env(safe-area-inset-bottom)` plus a keyboard inset variable, so it clears the home indicator.
- Sheets pad for the safe area and use `visualViewport` for keyboard height.
- All three text inputs checked (Inbox add, Quick Capture, Search) are 16px, so iOS will not zoom on focus.
- No horizontal overflow at 320, 375, 390, 430 or 844 (measured).
- The dock is 278px wide at 320px and its buttons are 44×44.

---

## Findings and recommendations

### P0

**M1. The page scrolls inside an inner box, not the document.**
- *Evidence:* `html` and `body` are `overflow: hidden`; `.view` is the scroller (`overflow-y: auto`, `overscroll-behavior-y: contain`). Measured: document height equals viewport height; `.view` scrollHeight 779 vs clientHeight 724.
- *Why it matters (verify):* Safari collapses its toolbars only when the **document** scrolls. With an inner scroller they stay expanded, which costs roughly 50–80px of vertical space on every screen (your screenshot shows the full Safari bar permanently present). Tapping the status bar to scroll to top, find-in-page and scroll restoration also work worse with inner scrollers.
- *Fix:* scroll the document on mobile. Make the dock and sheets `position: fixed` (already true for the dock). Replace the scroller's `mask-image` fade with a fixed gradient overlay above the dock. Lock body scroll only while a sheet is open.
- *Risk:* medium. This touches the base layout, so it needs a full screen-by-screen retest at 320/390/430 and with the keyboard open.

**M2. Short phones: the dock covers the card and the fold hides the rest.**
- *Evidence (320×568):* dock top at 500px; hero card bottom at 517px, so the dock covers the bottom 17px of the card. The primary button's bottom edge is at 498px, 2px above the dock. "Other active priorities" rows start at 573px, below the visible 568px. The card title wraps to 3 lines.
- *At 375×667:* one other-priority row is above the dock; the second is under it.
- *Fix:* add a short-screen rule (about `max-height: 700px`): hide the page subtitle, reduce the title to 30–32px, card padding 16, hero title 20px at widths ≤ 360, and keep at least 12px clear between the card and the dock. Acceptance: at 320×568 the card's bottom is never behind the dock.

**M3. Landscape phones get the desktop layout.**
- *Evidence (844×390):* the 761px width breakpoint switches to the sidebar layout. The dock disappears, about 232px of header sits above the card, and the card's button is at 543–593px, below the 390px-tall screen. The primary action needs a scroll to reach.
- *Fix:* choose the layout by input type and height, not width alone. For example, use the mobile layout when `(pointer: coarse) and (max-width: 1024px)`, plus a compact header and a smaller dock when `(max-height: 500px)`. Keep the desktop sidebar for mouse devices.

**M4. All data is in `localStorage` only (risk to user data).**
- *Evidence:* `app.js` uses `localStorage`; there is no service worker or manifest.
- *Risk (verify):* WebKit limits script-writable storage for sites used in a normal browser tab (about 7 days without interaction). A to-do app opened in Safari tabs could silently lose its data. Installed home-screen web apps are treated differently.
- *Fix:* (1) add the PWA metadata in M10 and prompt "Add to Home Screen"; (2) make backend sync a near-term priority (it is already a later-phase item in `AGENTS.md`); (3) show a quiet "Back up now" reminder after a period without a backup. Check current WebKit documentation before relying on the exact retention period.

### P1

**M5. Touch polish is missing.** No `-webkit-tap-highlight-color`, `user-select` or `-webkit-touch-callout` rules, so taps flash the default gray overlay and long-presses can select text on buttons. *Fix:* set tap highlight to transparent, `user-select: none` on controls (not on text), and rely on the existing `:active` states.

**M6. No `text-size-adjust`.** Safari can inflate text when the phone rotates. *Fix:* `-webkit-text-size-adjust: 100%; text-size-adjust: 100%` on `html`.

**M7. Blur on surfaces that are nearly opaque.** `exe-ui.css` has 23 `backdrop-filter` declarations. The ordinary cards and rows are 96–97% opaque, so their blur cannot be seen, but each one still costs GPU time while scrolling. *Fix:* keep `backdrop-filter` only on the dock and the priority card. Confirm the cost with a scroll profile on an older iPhone **(verify)**.

**M8. Side gutters are 14px, not 16px.** The card, title and rows start at x = 14. The system gutter is 16. *Fix:* one `--gutter: 16px` token for pages and sheets; 12px only at ≤ 320px.

**M9. The header takes about 150px before the first card** (19% of an 844px screen, 29% of a 568px screen): logo row 44px, title 44px, subtitle 22px, plus gaps. *Options:* (a) shorter subtitle or none on short screens (also in M2); (b) a header that shrinks to the logo row after the first few pixels of scroll (needs M1); (c) merge logo and title into one row.

**M10. No home-screen / installed-app metadata.** There is no manifest, `apple-touch-icon`, `apple-mobile-web-app-capable` or status-bar style, so "Add to Home Screen" shows a generic page icon and runs as a browser tab. *Fix:* add a web manifest (name, `display: standalone`, theme and background colors, icons 180/192/512), the Apple touch icon and the Apple meta tags. The dock already handles the home-indicator inset.

**M11. Type is set in `px`.** Browser and OS text-size settings will not scale the interface consistently. *Fix:* express the type scale in `rem` (16px base) and test at 130% **(verify across Safari and Chrome)**.

### P2

**M12. One-handed reach.** The card's primary button sits in the middle of the screen (y 422–472 of 844). The dock is in the thumb zone, the bell and account button are in the hardest zone (acceptable for secondary actions). Leave as is unless testing shows reach problems.

**M13. Whole-screen live region.** `#view` has `aria-live="polite"`, so rerenders can re-announce the whole screen (also in `DESIGN-AUDIT.md`, I2).

**M14. Pull-to-refresh is disabled** by `overscroll-behavior-y: contain`. That is right for this kind of app, but keep the rule when moving to document scrolling in M1.

**M15. Capture sheet with the keyboard open** is untested. The sheet is about 297px tall at 844px high and the code uses `visualViewport`. Test on a device with the keyboard and the Safari bar visible.

---

## Suggested order

1. **Mobile foundation (one PR):** M5, M6, M7, M8. Low risk, immediate polish.
2. **Short-screen and landscape layout:** M2, M3, M9(a).
3. **Document scrolling:** M1 (then M9(b)). Highest payoff, most risk. Needs the retest matrix.
4. **Installability and data safety:** M10, then M4 sync work.
5. **Type scale in rem:** M11, with the design-system token work.

## Acceptance checks (automatable)

- At 320×568 and 375×667, the card's bottom edge is above the dock's top edge, with at least 8px between them.
- At 844×390, the primary action is reachable without scrolling, or the mobile layout is used.
- No horizontal overflow at 320, 375, 390, 430 and 844.
- Document scrolling: on a normal page, `document.scrollingElement.scrollTop` changes when scrolling and `.view` does not scroll.
- Tap highlight is transparent; computed `user-select` on buttons is `none`.
- Number of elements with `backdrop-filter` on the Focus screen is 2 (card and dock).
- Manual: iPhone Safari, toolbar collapses on scroll; Add to Home Screen shows the Exe icon; keyboard open in Quick Capture.

---

## Implementation status (2026-11-08)

| Finding | Status | Notes |
|---|---|---|
| M1 document scrolling | **Done (mobile)** | Document scrolls; `.view` no longer scrolls; fixed fade replaces the mask; sheets still lock `body`. Verified in Chromium: Inbox scrolls the document, dock stays fixed, last row clears the dock, screen changes land at scroll 0. **Not verified on a real iPhone** (toolbar collapse is expected, not observed). |
| M2 short phones | **Done** | 320×568: card sits 25px above the dock (was covered by 17px). Hero title is 20px at ≤360px (still 3 lines at 320). |
| M3 landscape phones | **Done in CSS, untested on a touch device** | Layout is now chosen by `(max-width: 760px), (pointer: coarse) and (max-height: 500px)`. The queries parse, but the preview cannot emulate a coarse pointer, so the landscape layout itself was **not** seen. |
| M4 storage risk | **Partly** | PWA metadata added and `navigator.storage.persist()` requested. **Not done:** backend sync and a backup reminder. |
| M5 touch polish | Done | Transparent tap highlight; `user-select: none` and no callout on buttons. |
| M6 text-size-adjust | Done | `100%` on `html`. |
| M7 wasted blur | Done | Focus screen now has exactly 2 `backdrop-filter` elements (card, dock). Light theme only. |
| M8 gutters | Done | 16px, with safe-area side insets. |
| M9 header height | **Partly** | Tighter header on short screens. The collapsing header (b) is not built. |
| M10 installability | Done | `manifest.webmanifest`, icons (180/192/512/maskable/32), Apple meta tags. Not tested by actually installing. |
| M11 rem type scale | **Not done** | Deferred to the design-system token work. |
| M12, M14, M15 | No change | M15 still needs a real-device keyboard test. |
| M13 live region | Done | `aria-live` removed from `#view` (the toast keeps its own). |
