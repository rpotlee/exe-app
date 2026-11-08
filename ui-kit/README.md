Exe is a calm, native-feeling planner for iPhone, iPad and Mac. It follows Apple's Human Interface Guidelines: standard components, semantic colors, Dynamic Type, and Liquid Glass limited to the controls that float above content. Build with these rules before anything else.

## Principles

1. **Content first, controls float.** Content (captures, tasks, cards) is opaque, on `background` or `grouped`. Only navigation and controls (tab bar, capture bar, toolbar buttons) use glass (`glass-fill`, `glass-edge`, `shadow-float`). Never glass a card, row or sheet body.
2. **One action per view.** One prominent button (`tint-fill` + `on-tint`) per view. Everything else is bordered, tinted or plain.
3. **AI suggests, you decide.** Anything from AI carries the sparkle glyph and `ai` / `ai-text`, always shows a "Why", and changes nothing until the person taps Approve.
4. **Honest data.** No invented percentages or counts. Progress is steps done over steps total.
5. **Color is meaning, not decoration.** Blue (`tint`) = interactive/selected. Red (`critical`) = verified blockers and destructive actions only. Orange (`caution`) = decision needed. Green (`positive`) = ready/done. Indigo (`ai`) = AI. Every colored state also has a glyph and a word.

## Navigation

- Five tabs in this order: Focus, Inbox, AI Review, Map, Decisions. On regular width (iPad, Mac) they become a sidebar in the same order.
- Capture is an action, not a destination: the **capture bar** floats above the tab bar (bottom accessory) and opens the Quick Capture sheet. On Mac it is a toolbar button with ⌘K.
- Root screens use a large title; pushed screens use an inline title with a Back button. Never title a screen with the app name.
- Never hide, disable or overflow a tab. AI Review may show a numeric badge in `ai`.

## Color

- Use semantic tokens, never raw hex in components. Layer: `background` -> `background-secondary` -> `background-tertiary` on plain screens; `grouped` -> `grouped-secondary` -> `grouped-tertiary` on grouped screens (Focus, AI Review, Map, Decisions, Settings use grouped; Inbox uses plain).
- Text hierarchy: `label`, `label-secondary`, `label-tertiary`, `placeholder`; separators `separator` (hairline) and `separator-opaque`.
- Status colors have separate fill and text tokens (`critical` vs `critical-text`). Use the `-text` token for any text; the plain token for glyphs and fills only.
- Every theme is supplied: Light, Dark and Light with increased contrast (`light-hc`). Honor the system setting; do not build an in-app theme switch.

## Typography

- Use the system font stack (`--font-sans`: SF Pro on Apple devices) with the 11 Dynamic Type styles at their Large (default) sizes: `large-title` 34/41, `title-1` 28/34, `title-2` 22/28, `title-3` 20/25, `headline` 17/22 semibold, `body` 17/22, `callout` 16/21, `subhead` 15/20, `footnote` 13/18, `caption-1` 12/16, `caption-2` 11/13.
- Body and row text is `body`. Never set text smaller than `caption-2` or in Ultralight/Thin/Light weights. Prefer two weights: regular and semibold (bold for large titles).
- Text must scale with the person's Dynamic Type setting: layouts grow, rows wrap, nothing truncates critical text.

## Layout

- 4pt grid via `space-*`. Margins: `space-4` on iPhone (compact width), `space-5` on iPad/Mac (regular). Group related items; separate groups with `space-6`.
- Tap targets are at least `hit` (44pt). Respect safe areas; keep content clear of the home indicator and the floating dock (add bottom inset = dock height).
- Corners are concentric: sheet `radius-xl` (34) holds cards `radius-lg` (22) holds inner panels `radius-md` (14) with 8-12pt insets. Capsules (`radius-pill`) for buttons, chips, tab bar and capture bar.
- Design for size classes, not devices: compact = single column + tab bar; regular = sidebar + content.

## Components in use

Primary screens: Focus -> `PriorityCard` plus a `ListRow` list; Inbox -> `ListRow` with checkboxes and `SegmentedControl` filter; AI Review -> `SuggestionCard` stack; Map -> `DependencyChip` rows and `BlockerBanner`; Decisions -> `DecisionCompare`. Capture -> `CaptureBar` then `Sheet`.

## Motion and feedback

- Motion explains, never decorates: sheet slide, tab cross-fade, a subtle check animation. Respect Reduce Motion (swap for fades or none) and Reduce Transparency (glass becomes opaque `grouped-secondary`).
- Haptics: light impact on check, success on Approve, warning on destructive confirm. Always pair with a visible change.

## Writing

- Short, plain, verb-first buttons: Approve, Dismiss, Start focus. Sentence case. Say what will happen and what will not ("Nothing changes until you approve").
- Errors say what to do next. No jargon in user-facing strings.
