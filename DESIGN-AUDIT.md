# Exe — Design Audit and Design System v1

**Date:** 2026-11-08 · **Branch:** `feat/phase-1b-mockup-fidelity` · **Status:** audit + proposal. Nothing in this document has been implemented.

## 0. How to read this

This is a structured expert review: it applies Apple's Human Interface Guidelines, WCAG 2.2, and established cognitive-accessibility guidance (ADHD, executive function) to the running app. It is **not** a review by Apple or any firm, and it is **not** user research. Every finding below says what was measured and what was only observed.

**Method.** All five screens plus Quick Capture and Focus Mode were opened in a Chromium preview at 390px; Focus was also opened at 1280px. A script measured type sizes, weights, radii, shadows, tap-target sizes, accessible names, headings and text contrast on every screen. The markup (`index.html`), both stylesheets, and `V1-LOCKED-SPEC.md` were read. Your iPhone screenshots were used to see real Safari rendering.

**Not verified (do not treat as passed):**
- Dark theme (not audited at all).
- VoiceOver / TalkBack, Switch Control, Voice Control.
- 200% and 400% zoom / reflow, Dynamic Type.
- Desktop at true 1280px (the preview scaled the screenshot to about 380px wide, so desktop findings are layout-level only).
- Real users. Nothing here replaces testing with people who have ADHD.
- Two "low contrast" hits from the script (Inbox filter count, Decisions "Mark resolved") are **false positives**: white text on a gradient-filled button that the script could not read. Not counted.

---

## 1. Verdict

Exe has a strong **core idea and information architecture** (one current priority, fast capture, AI that asks before acting). The **visual system is inconsistent**: the Focus screen and the dock were refined over many passes, and the other four screens were not. Map and Decisions still use an older, denser style with tiny type and different corner radii. Focus Mode is a different product visually. There is no single source of design truth, which is why every change has felt like a fight.

| Area | Grade | One-line reason |
|---|---|---|
| Core concept & IA | **A−** | Matches ADHD needs: one priority, capture anywhere, calm AI. |
| Focus screen | **B+** | Clear hierarchy; the glass card is the strongest surface. |
| Inbox | **B** | Clean and fast; checkboxes and filters are undersized. |
| AI Review | **C+** | Empty state is tall and wordy; duplicate explainer panel. |
| Map / Decisions | **D+** | Dense, 11–12px text, odd weights, hidden horizontal scrollers. |
| Focus Mode | **C** | Dark, red/orange glow, different controls; breaks the system and the "red = blocked" rule. |
| Navigation | **B−** | Beautiful dock, but icon-only trades clarity for style. |
| Design system | **D** | 16 font sizes, 11 corner radii, 7 weights, three token files. |
| Accessibility | **C+** | Good foundations (lang, landmarks, labels, reduced motion); real gaps listed below. |
| ADHD fit | **B−** | Strong skeleton, weakened by density on Map/Decisions and ambiguous status. |

---

## 2. Findings (prioritized)

**P0** = fix first, blocks consistency or accessibility. **P1** = high impact. **P2** = polish.

### A. Design-system consistency

| # | Finding | Evidence | Fix | Pri |
|---|---|---|---|---|
| A1 | **No coherent type scale.** | 16 distinct sizes across screens: 10, 11, 12, 13, 14, 15, 16, 16.5, 17, 18, 19, 21, 22, 23, 25, 38.5px. | Adopt the 7-step scale in §4.2. Remove 10/11px entirely. | P0 |
| A2 | **Weights are chaotic.** | 400, 500, 550, 600, 700, 750, 800 in use. 550 and 750 appear only on Map/Decisions. | Four weights only: 400/500/600/700. | P0 |
| A3 | **Corner radii: 11 values.** | 1.75, 6, 7, 10, 16, 18, 20, 22, 28px, 50%, pill. Map/Decisions are dominated by 10px. | Four radii + pill (§4.4). Map/Decisions get the same radii as Focus. | P0 |
| A4 | **Screens are at different design generations.** | Focus/Inbox use the new card style; Map and Decisions use older nested boxes with hairlines and tiny type (see §3). | Rebuild Map/Decisions on the same card and row components. | P0 |
| A5 | **Three token sets.** | `design-tokens.css` (87 tokens), token blocks at the top of `exe-ui.css`, and a separate `design-master/tokens.css`. | One token file. Retire or archive `design-master/`. | P0 |
| A6 | **Hard-coded values in components.** | 40 hex and 51 rgba literals in `exe-ui.css` below its token block (dock gradient, hero bezel, shadows, sheen). | Move every colour/shadow into a token; add a lint check (§6). | P1 |
| A7 | **Shadows are bespoke per component.** | 1–3 different shadow recipes per screen; the hero alone uses 6 layers. | Five elevation tokens (§4.5). | P1 |
| A8 | **Legacy stylesheet with duplicated rules.** | `styles.css` is 2,392 lines; `.priority-hero` is defined twice; overrides are layered on top. | Delete dead rules; fold what remains into the component layer. | P1 |
| A9 | **Breakpoints are scattered.** | 360, 760/761, 980, 1150/1151. | Three: 360 (compact), 760 (mobile→desktop), 1100 (wide). | P2 |

### B. Visual language and composition

| # | Finding | Fix | Pri |
|---|---|---|---|
| B1 | **Focus Mode is a different design language.** Dark smoky purple, red/orange glow top-right, outlined buttons, 7px square checkboxes while the rest uses circles. Red glow also violates "red = verified blocker only". | Use the same white system. If a distinct "deep work" mood is wanted, use graphite (matches the dock) with no red/orange. | P0 |
| B2 | **Too many glass treatments.** Hero glass, dock graphite, rows near-white, sheets frosted. | **One-glass rule:** one clear-glass surface per screen (the hero). Everything else is solid-soft. See §4.6. | P1 |
| B3 | **Hero bezel is a special case.** It uses a hand-built offset pseudo-element. | Keep it, but document it as the only exception and tokenize it. | P2 |
| B4 | **Desktop leaves most of the canvas empty.** Content sits in about 750px at the left of a 1280px+ canvas. | 12-column grid, max width about 1120px, centered; use the right column for context (Inbox preview, step detail). | P1 |
| B5 | **Empty states are heavy.** AI Review's empty card is about 220px tall with a boxed icon and three lines. | Empty state: one line, one optional action, no boxed icon. | P1 |
| B6 | **Duplicate explainer on AI Review.** "Designed to protect your focus" repeats the header's message. | Remove or move to a help sheet. | P1 |
| B7 | **Horizontal scrollers hide content.** Map workstream chips and Decisions list show a visible scrollbar and truncate ("…launch in fi"). | Replace with a vertical list or a segmented selector that fits. Never truncate a title with no way to read it. | P0 |
| B8 | **Nested boxes (Map).** Card → outcome box → step rows → status chip. | Max two levels of containment. Use spacing and hairline dividers instead of nested borders. | P1 |

### C. Typography

| # | Finding | Fix | Pri |
|---|---|---|---|
| C1 | **Text is too small in dense screens.** Map has 6 elements at 11px and 23 at 12px; Decisions 3 at 11px and 20 at 12px. | Minimum 12px for captions, 13px for secondary UI text, 16px for anything read. | P0 |
| C2 | **Page titles carry a stray period.** The five `h1` elements are all 38.5px, but the text of the non-Focus ones includes a trailing "." that is hidden visually and may be read aloud. | Remove the period from the DOM text, or hide it with `aria-hidden`. | P2 |
| C3 | **Letter-spacing varies per component** (-0.9, -0.65, -0.5, -0.4, -0.35, -0.2, -0.1…). | Letter-spacing is part of each type token, not per component. | P1 |
| C4 | **No distinction between "reading" and "scanning" text.** Row titles and body are both 14–16px. | Body 16/24 for reading; Subhead 15/20 for rows; Footnote 13/18 for metadata. | P1 |

### D. Colour

| # | Finding | Fix | Pri |
|---|---|---|---|
| D1 | **Cobalt is used for too many jobs** (eyebrow, ring, links, checked state, badge, button, active icon). | Cobalt = actions and state only. Labels use ink-3 (gray). Already partly fixed on the hero. | P1 |
| D2 | **Focus ring is cobalt `#2f54eb` on every surface.** On the graphite dock and in Focus Mode it is roughly 2:1 against the surface (estimated, not measured). WCAG 2.2 needs 3:1. | Ring color token per surface: cobalt on light, `#9fb3ff` on dark. | P0 |
| D3 | **Status colors are underspecified.** Red = blocked (good). Amber appears for "Unresolved"; green is unused. | Define success/warning/danger/info tokens and require an icon plus a word with each. | P1 |
| D4 | **Secondary text on cards is borderline in places** (4.85:1 for "Not started"). | Floor all text at 4.5:1; use the `ink-3` token (5.5:1) for meta. | P1 |

### E. Layout, spacing, composition

| # | Finding | Fix | Pri |
|---|---|---|---|
| E1 | **Spacing is not on a grid.** Values like 14, 18, 22, 26 sit beside 8/16/24. | 4-pt grid; allowed steps 4, 8, 12, 16, 20, 24, 32, 40, 56. | P1 |
| E2 | **Inbox list sits directly on the canvas** with 1px dividers and 20px checkboxes. It reads as unfinished next to the floating cards. | Put the list in one floating card; 44px row height minimum; checkbox 24px with a 44px hit area. | P1 |
| E3 | **Page header is repeated per screen** (logo + bell + title + paragraph). Subtitles are long on Map/AI Review/Decisions. | Header = title + one short status line. Move explanations to a "?" sheet. | P1 |
| E4 | **Bottom clearance** is correct at the end of the page but the dock still covers content at first load on short screens. | Keep the fade; verify at 667px height (iPhone SE). | P2 |

### F. Navigation and IA

| # | Finding | Fix | Pri |
|---|---|---|---|
| F1 | **Icon-only dock reduces clarity and discoverability.** Names exist only for screen readers. Two icons are ambiguous: sparkles (AI Review) and git-branch (Decisions, a developer metaphor). Icon-only navigation tends to lower task success, especially under cognitive load. | **Recommended compromise:** the active item expands to show its label; the others stay icon-only. Same footprint, no guessing. (Owner decision: you asked for icon-only.) | P1 |
| F2 | **Naming is inconsistent.** Sidebar: "Project Map". Dock: "Map". Page: "Project Map". Page title says "Mission Status", tab says "Focus". | One name per destination (copy pass is already planned). | P1 |
| F3 | **Desktop and mobile differ in navigation style** (labeled sidebar vs icon-only dock). | Pick one rule (see F1) and apply it everywhere. | P1 |
| F4 | **Search and Settings** are in the desktop sidebar but there is no visible entry point on mobile (spec §2 requires one). | Add a header overflow or account menu on mobile. | P1 |
| F5 | **Quick Capture** is excellent: global, one tap, saved draft state. Keep as is. Restyle its Save button to the flat cobalt button. | — | P2 |

### G. Components

| # | Finding | Fix | Pri |
|---|---|---|---|
| G1 | **Checkbox exists in three shapes** (hero circle, Inbox/Map rounded square, Focus Mode square). | One checkbox: 24px circle, flat cobalt when done, 44px hit area. | P0 |
| G2 | **Buttons exist in four styles.** Flat cobalt (hero), gradient cobalt (sheet Save), outlined glass (Focus Mode), tinted (filters). | Primary (flat cobalt capsule), Secondary (soft white), Tertiary (text). Nothing else. | P0 |
| G3 | **Filter pills are 40px tall** (target 44). | Visual 36px inside a 44px hit area. | P1 |
| G4 | **Map checklist rows are 39px tall with 17px checkboxes.** | Same row component as Focus/Inbox (min 56px). | P0 |
| G5 | **Brand button is 80×25px.** | Hit area 44px high. | P2 |
| G6 | **Completion state:** rows dim to 40% opacity. Calm, but low-contrast text on a finished row is hard to re-read. | Dim to 55% and keep the strike-through; add a quiet check animation. | P2 |

### H. Motion and feedback

| # | Finding | Fix | Pri |
|---|---|---|---|
| H1 | Reduced motion and reduced transparency are handled. | Keep. Add `prefers-contrast: more` and `forced-colors` support. | P1 |
| H2 | **No completion feedback** beyond dimming. For ADHD, immediate, calm reward matters. | 150ms check-draw + a "Done · Undo" toast. No confetti, no sound by default. | P1 |
| H3 | **Progress ring shows 0%** at the start, which reads as failure. | Show "Step 1 of 3" in the ring's place, or the ring plus "1 of 3"; reserve the percent for the detail view. | P1 |

### I. Accessibility (WCAG 2.2)

| # | Finding | Evidence | Fix | Pri |
|---|---|---|---|---|
| I1 | **Document title never changes.** Every screen is "Exe — Mission Status". | Measured on all five screens. WCAG 2.4.2. | Update `document.title` on navigation. | P0 |
| I2 | **The whole `#view` is `aria-live="polite"`.** Checking one box can re-announce the entire screen. | `index.html` line with `id="view"`. WCAG 4.1.3 misuse. | Remove from `#view`; announce changes through the toast region only. | P0 |
| I3 | **Target size below 44px** (WCAG 2.5.8 min 24px, HIG 44pt). Map checkboxes 17px; Map rows 39px; Inbox filters 40px; Inbox checkboxes 20px (row label is larger); brand 25px high. | Measured. | Per G1–G5. | P0 |
| I4b | **Inbox row "more" control is about 2.6:1.** | `--raw-more` is `#94a3b8` on white. | Use `ink-3` (5.5:1). | P1 |
| I4 | **Focus ring contrast on dark surfaces** is estimated at about 2:1. | See D2. | Per D2. | P0 |
| I5 | **Text 11–12px on Map/Decisions.** | Measured. | Per C1. | P0 |
| I6 | **No skip link.** | `index.html`. | Add "Skip to content" as the first focusable element. | P1 |
| I7 | **Horizontal scrollers** need a keyboard-accessible alternative. | Visual. | Per B7. | P1 |
| I8 | **Status is not conveyed by color alone — verify.** Spec requires icon plus text for Blocked. | Not fully checked. | Add a test per screen. | P1 |
| I9 | **No `prefers-contrast` / `forced-colors` handling.** | Grep of both stylesheets. | Add token overrides. | P1 |
| I10 | Positive: `lang`, landmarks (`aside`, `nav`, `main`), skip-able headings (H1→H2→H3 correct), form controls named, zoom not disabled. | Measured. | Keep. | — |

### J. ADHD / executive-function fit

What already works: **one current priority**, a visible **next step**, **global capture** in one tap, a protected **Focus Mode** ("new thoughts go to Inbox"), AI that **asks before acting**, no streaks, no guilt mechanics.

| # | Finding | Recommendation | Pri |
|---|---|---|---|
| J1 | **Density on Map/Decisions overloads working memory.** Many boxes, tiny type, chips, tags, all visible at once. | Progressive disclosure: show one outcome expanded, others collapsed; one decision at a time. | P0 |
| J2 | **Inbox shows all 18 items at once.** A long raw list invites avoidance. | Show the first 7 with "Show 11 more"; group by "Today / Earlier". Keep the raw list complete (spec requirement). | P1 |
| J3 | **Ambiguous status.** "2 blocked" and the Inbox badge "2" are not explained. | Plain-language label ("2 waiting on something else") and a tap to see why. | P1 |
| J4 | **Reading load is high** (long subtitles, boxed explanations, truncated titles). | Max 2 lines of helper text per screen; sentences under 15 words. | P1 |
| J5 | **No re-entry support.** Returning after an interruption needs to answer "where was I?". | "Resume: Verify registration path" chip on Focus; Focus Mode restores its state (spec already says so). | P1 |
| J6 | **Progress framing.** 0% discourages. See H3. | Frame by steps, not percent. | P1 |
| J7 | **Time is invisible.** | Optional gentle focus timer (off by default); no countdown pressure. | P2 |
| J8 | **Badges as alarms.** | Use a quiet dot for "needs review"; reserve the number for the detail view. | P2 |
| J9 | **Forgiveness.** | Undo on every destructive or completion action; Quick Capture keeps the draft. (Draft behaviour not verified.) | P1 |
| J10 | **Predictability.** | Same control, same place, on every screen: Capture always bottom-right of the dock; primary action always the lowest full-width button. | P1 |
| J11 | **Decision fatigue.** Hero offers "All steps", "Enter Focus Mode", row taps. | One primary action per screen; secondary actions visually quiet. | P1 |

### K. Content and copy (copy pass is planned; these are design-relevant only)
- "Mission Status" vs "Focus": two names, one screen.
- "Altr Workspace" is hard-coded in the sidebar, topbar and avatar.
- "AI Review" copy correctly says the prototype uses local rules. **Keep this honesty.**
- Subtitles on Map/Decisions are marketing-length ("Outcomes, actions, decisions and related work — without the noise.").

### L. Engineering and process
- **Concurrent editors.** A separate Codex session has edited `exe-ui.css` and `styles.css` in the same folder at least twice during this work (a stray "Phase 16" block, and an offset-wall rule that reappeared). Use a separate branch or worktree per tool.
- **Nothing is committed.** 12+ files modified plus untracked files (`exe-ui.css`, new assets, owner reference images). A single bad edit can lose all of it.
- **Tests cannot run on this Mac** (no Playwright). The updated Python tests have only been syntax-checked, and the dock tests will fail on the removed labels.
- **Untracked stray assets:** `assets/diagonal-paint.png`, `white-paint.png`, `yellow-paint.jpg` (origin unknown).

---

## 3. Screen-by-screen notes

- **Focus (mobile):** Best screen. Ring + title + next step + one button. Ring "0%" (H3). "All steps" is a quiet text button (good). Other priorities are two rows; consider showing the *reason* each is in Now (spec calls for explainable priority logic).
- **Inbox:** Clean. Quick-add and filters are good. Needs a card container, bigger hit areas, chunking (J2). The row's "more" control (`--raw-more: #94a3b8`) is about 2.6:1 on white, **below the 4.5:1 floor** (computed from the hex, not seen in a screenshot). On mouse devices it is hidden until hover or keyboard focus (touch devices always show it), which is acceptable, but it needs a darker token.
- **AI Review:** Empty state too large; duplicate explainer; "Back to inbox" button competes with the dock. Move "Back to inbox" to a text link.
- **Map:** Tiny type, nested boxes, horizontal chip scroller with scrollbar. Highest-priority rebuild.
- **Decisions:** Same problems as Map; titles truncate in the picker.
- **Quick Capture sheet:** Strong. Save button needs the new flat button.
- **Focus Mode:** Visually unrelated (B1). Two outlined buttons at the top with unclear hierarchy ("Return to Exe" vs "Capture thought").
- **Desktop Focus:** Correct structure; unused canvas (B4).

---

## 4. Design System v1 (proposal — requires owner approval before implementation)

### 4.1 Principles
1. **One thing at a time.** Each screen has one primary action and one focal element.
2. **Calm by default.** Motion is brief; color is rare; status uses words and icons.
3. **Solid content, glass chrome.** Content is solid-soft. Exactly one clear-glass surface (the hero) and the dock.
4. **Everything is a token.** No hex, rgba, px radius or shadow outside the token file.
5. **44 is the minimum.** Any tappable thing has a 44×44px hit area.
6. **Honesty.** Never show invented progress; prototype features are labeled as such.

### 4.2 Typography — Inter
| Token | Size/Line | Weight | Tracking | Use |
|---|---|---|---|---|
| `display` | 34/40 | 700 | -0.9px | Page title |
| `title` | 22/28 | 600 | -0.4px | Card title, sheet title |
| `headline` | 17/22 | 600 | -0.3px | Row title, button label |
| `body` | 16/24 | 400 | -0.2px | Reading text, inputs (16px prevents iOS zoom) |
| `subhead` | 15/20 | 500 | -0.1px | Secondary lines |
| `footnote` | 13/18 | 500 | 0 | Metadata, counts |
| `caption` | 12/16 | 600 | +0.06em, uppercase | Eyebrows only. **No smaller size exists.** |

Weights: 400, 500, 600, 700 only. Tabular numerals for all counts and percentages.

### 4.3 Color
| Token | Value | Notes |
|---|---|---|
| `canvas` | `#FFFFFF` | Page |
| `surface` | `#FFFFFF → #F5F7FB` gradient | Cards and rows |
| `ink` | `#0F172A` | Primary text (about 17:1) |
| `ink-2` | `#36445A` | Secondary text (about 9:1) |
| `ink-3` | `#56657F` | Meta (about 5.5:1 on white) — floor for text |
| `accent` | `#2F54EB` | Actions, checked, active, ring |
| `accent-ink` | `#2A4BE0` | Accent text on white (6.2:1) |
| `accent-on-dark` | `#9FB3FF` | Active icon on graphite |
| `graphite` | `#2F3640 → #373E49` | Dock, deep-work surfaces |
| `danger` | `#B42339` | Verified blocked only, always with icon + word |
| `warning` | amber (to be chosen and measured) | Genuine warnings, with icon + word |
| `success` | green (to be chosen and measured) | Completed only, with icon + word |
Rule: text never goes below 4.5:1 (3:1 for 24px+ text); UI boundaries 3:1.

### 4.4 Spacing and radii
- Spacing (4pt): 4, 8, 12, 16, 20, 24, 32, 40, 56. Card padding 20. Screen gutter 16. Group gap 24; item gap 8–12.
- Radii: **28** card/sheet, **20** row/field, **14** inner container, **pill** buttons/chips/dock, **50%** checkbox/avatar.

### 4.5 Elevation (cool charcoal-navy `rgb(30,44,86)`; never colored glows)
| Token | Use | Recipe |
|---|---|---|
| `e0` | Flat | none |
| `e1` | Rows | contact `0 1px 2px .08` + `0 10px 18px -8px .14` |
| `e2` | Cards | `0 1px 2px .08` + `0 24px 38px -16px .26` + `0 6px 16px -6px .12` |
| `e3` | Hero glass | e2 + `0 48px 64px -30px .24` |
| `e4` | Dock, sheets | `0 2px 4px .16` + `0 14px 22px -6px .34` + `0 30px 44px -18px .38` |

### 4.6 Components
- **Card:** `surface`, radius 28, `e2`, padding 20, no outline.
- **Row:** min height 56, radius 20, `e1`, 12px gap, chevron or status right-aligned.
- **Primary button:** flat `accent`, pill, 50px, 17/22 600, white label, no icon, pressed = scale .98 + darker. One per screen.
- **Secondary button:** `surface`, `e1`, pill, 44px. **Tertiary:** text in `accent-ink`.
- **Checkbox:** 24px circle, 1.5px `#8590A6` edge (3.2:1), flat accent when checked, 44px hit area on the row.
- **Chip/filter:** 36px visual, 44px hit area, pill.
- **Ring:** 54px, 4.5px stroke, step fraction in the center.
- **Dock:** graphite pill, 44px items, active = `accent-on-dark`; compromise F1 shows the active label.
- **Sheet:** radius 28 top, `e4`, drag handle, 16px inputs.
- **Empty state:** one line, optional text button, no icon box.
- **Toast:** graphite, 3s, with Undo where relevant.
- **Hero glass (the single exception):** clear glass + thin lit bezel. Tokenized.
- **States, all components:** default, hover (pointer only), pressed, focus-visible (3px ring, 3:1), disabled (ink-3 at 45%), loading, success, error.

### 4.7 Motion
Durations 120 / 200 / 320ms; ease `cubic-bezier(.2,.8,.2,1)`. Allowed: press scale, check draw, sheet slide, progress fill. Disallowed: parallax, looping animation, auto-advancing content. `prefers-reduced-motion` removes all transforms.

### 4.8 Accessibility defaults
Title per screen; skip link; `aria-live` only on the toast; 44px targets; visible focus on every surface; `prefers-contrast` and `forced-colors` token overrides; VoiceOver pass per release gate.

---

## 5. ADHD design checklist (use for every new screen)
- [ ] One obvious next action; others visually quiet.
- [ ] No more than 7 items visible before "show more".
- [ ] No text under 12px; helper text max 2 lines.
- [ ] Status in words + icon; no color-only meaning; no alarm colors for non-blockers.
- [ ] Progress framed as steps, never as a shortfall.
- [ ] Every completion is acknowledged and undoable.
- [ ] Re-entry: the screen says where you left off.
- [ ] Same control in the same place as every other screen.
- [ ] No motion that cannot be turned off; nothing moves on its own.
- [ ] Interruptions have a safe place to go (Capture).

---

## 6. Roadmap with acceptance tests

| Phase | Scope | Acceptance (all automatable unless noted) |
|---|---|---|
| **0. Safety** | Commit current work on the branch; separate branch/worktree per tool; remove stray assets. | `git status` clean; PR open. |
| **1. System** | One token file; type/spacing/radii/elevation tokens; delete dead CSS; lint rule. | Script reports 0 hex/rgba literals outside the token file; ≤ 7 font sizes and ≤ 5 radii found at runtime on all five screens. |
| **2. Components** | Checkbox, buttons, row, card, chip, empty state, sheet. Replace Map/Decisions styling. | Runtime scan: all tappables ≥ 44px; one checkbox style; no 11px text. |
| **3. Accessibility** | Titles, remove `aria-live` from `#view`, skip link, focus ring per surface, `prefers-contrast`, forced-colors. | Title differs per screen; contrast scan ≥ 4.5:1 text, ≥ 3:1 focus/UI; manual VoiceOver run on Focus → Inbox → Capture. |
| **4. Screens** | Map and Decisions rebuild with progressive disclosure; Inbox card + chunking; AI Review empty state; Focus Mode restyle. | Screenshot review at 320/390/430 and 1280; owner sign-off. |
| **5. ADHD layer** | Step framing, completion feedback + undo, resume chip, optional timer (off by default). | Behavior tests; owner sign-off. |
| **6. Validation** | 5 users with ADHD on a 3-task script; iPhone Safari + Chrome; 200% zoom; Dynamic Type. | Task success ≥ 4/5; no P0/P1 left open. |

---

## 7. Decisions needed from you
1. **Dock labels:** keep icon-only, or adopt "active item shows its label" (F1)?
2. **Focus Mode:** same white system, or a deliberate graphite "deep work" mode with no red?
3. **Ring text:** step fraction ("1 of 3") instead of "0%"?
4. **Map/Decisions:** approve a rebuild on the same components, with progressive disclosure?
5. **Desktop width:** approve a centered 1120px max-width grid?
6. **Commit now?** I recommend a checkpoint commit before any of this starts.

## Appendix — measured data (390px, Chromium)
| Screen | Distinct font sizes | Weights | Radii | Targets < 44px | 11–12px text |
|---|---|---|---|---|---|
| Focus | 10 | 400/500/600/700/800 | 7 | 2 | 4 |
| Inbox | 6 | 400/500/600/700/800 | 7 | 22 | 4 |
| AI Review | 8 | 400/700/800 | 6 | 1 | 3 |
| Map | 8 | 400/550/700/750/800 | 6 | 11 | 29 |
| Decisions | 6 | 400/600/700/750/800 | 5 | 1 | 23 |
Totals across the app: 16 sizes, 7 weights, 11 radii, 3 token files, 40 hex + 51 rgba literals in component CSS.

---

## Implementation status (2026-11-08)

**Done and measured (390px, Chromium):**
- A1/C1: no text under 12px on any screen. The type scale in use is 12, 13, 15, 16, 17, 22, 38 (display), plus the 25px logo. Down from 16 sizes.
- A2: weights are 400, 500, 600, 700 (800 only in the logo). Down from 7.
- A3 (partly): rows, tags, pills and buttons use the system radii. Remaining non-system radii are transparent icon buttons.
- G1: one checkbox everywhere (24px circle, 3.2:1 edge, flat when done). **This now also applies to Inbox and Map.**
- G2 (partly): primary buttons are flat accent; the Quick Capture Save and decision actions are 50px capsules.
- G3/G4/G5/I3: Inbox filters 44px, Map rows 56px, brand button 44px. No tappable element under 44px on any of the five screens.
- I1: each screen has its own page title.
- I6: skip link added. C2: the stray period in headings is hidden from assistive tech.
- D2/I4: focus ring is light blue on the dock and in Focus Mode.
- I4b: Inbox "more" control contrast fixed.

**Still open (not started):**
- B1 / Focus Mode redesign; B2 one-glass rule; B4 desktop grid.
- B7 / J1: Map and Decisions still have the horizontal scroller (visible scrollbar, truncated decision titles) and nested boxes. They need the progressive-disclosure rebuild.
- B5/B6: AI Review empty state still tall, duplicate explainer still present.
- E1: spacing is not yet on the 4-pt grid. E2: Inbox list is not in a card.
- D1/D3: cobalt is still used for many jobs; success/warning tokens are not defined.
- F1: dock labels (icon-only kept by owner decision; active-label option not built).
- H2/H3, J2-J11: completion feedback, resume chip, chunking, plain-language status.
- A5/A6/A7/A8: one token file, tokenizing component literals, elevation tokens, deleting dead legacy CSS.
- I9: `prefers-contrast` and `forced-colors`. Dark theme is unaudited.
