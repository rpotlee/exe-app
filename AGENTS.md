# Exe engineering guardrails

## Product and architecture (unchanged)

- **Read `V1-LOCKED-SPEC.md` before changing product behavior.** Product architecture, entities, and functional workflows are frozen. Do not replace them or introduce a new methodology.
- **Visual design and navigation layout are governed by this file and `exe-ui.css`, not by the spec's visual sections.** The owner directed (2026-11-07) that the mockups and the direction below take precedence over the spec's written visual and navigation details.
- The baseline is a **prototype**, not a deployed or fully functional AI application. Do not claim otherwise.
- Inbox opens immediately to a **raw, editable, checkable to-do list**; raw Capture completion remains distinct from AI review status and structured Task completion.
- AI recommendations require user approval. No silent merging, reclassification, deletion, blocker creation, task completion, or priority promotion.
- Maintain at most three active Now priorities. Show clear, explainable priority logic and dependency types.
- Never show fabricated progress. Mockup numbers (percentages, counts) are illustrative only; show real data.
- Keep credentials on secure backend only. Implement authentication, persistent storage and cross-device sync in later scoped phases.

## Navigation

- Five destinations: **Focus, Inbox, AI Review, Map, Decisions**. Both the mobile dock and the desktop sidebar show visible labels (DEC-004 in `DECISIONS.md` retired the icon-only dock). The "Project Map" destination is labeled **Map** everywhere.
- **Mobile:** a dark graphite dock (owner, DEC-007) holding the five labeled tabs, with a light-cobalt active state. Quick Capture is a **separate** cobalt round `+`, elevated just above the dock's right end, never a sixth tab and never covering the centre tab (DEC-004). Do not put it back inside the dock.
- **Desktop:** glass sidebar plus a global Quick Capture control (`Cmd/Ctrl+K`) in the top bar.
- **Active state is only an icon and label color change to cobalt.** No capsule, glow, or filled background on the active tab or sidebar item.
- On mobile the logo and the AI Review bell are part of each page header (they scroll with the page); there is no separate fixed top bar.
- Focus heading is `Mission Status`. No top metrics row. One current priority plus two other active Now priorities.

## Visual direction (current)

- **The Exe UI kit governs the look (owner direction, 2026-11-08, replacing the earlier pearl/graphite/cobalt direction).** Source of truth: `ui-kit/` (`tokens.json`, component rules, README principles) and its implementation in `exe-ui.css`. The older sections of this file and DEC-004/DEC-007 visual details are superseded.
- Two layers: **content is opaque** (cards, rows, the priority card on `grouped`/`background`); **Liquid-Glass-style blur is only for floating controls** (mobile tab bar and capture bar, desktop sidebar and toolbar button). Never glass a card.
- Mobile: a floating glass **capture bar** (bottom accessory) directly above a glass **tab bar** with five labeled tabs. Selected tab = tint icon + label + a quiet fill. Capture is never a tab. Desktop: sidebar + toolbar Quick Capture (`Cmd/Ctrl+K`).
- Appearance follows the system (`index.html` script); `?theme=light|dark` overrides. Light, dark and increased-contrast values live in the kit tokens.
- Color meaning: tint blue = interactive/selected; red = verified blockers and destructive only; orange = decision needed; green = ready/done; indigo = AI. Always a glyph and a word as well. Text keeps 4.5:1.
- Tokens are at the top of `exe-ui.css`; components use tokens, never hard-coded theme colors. Radii: 34 sheets, 22 cards, 14 inner panels/rows, pill for capsules. System font stack (SF Pro on Apple devices).
- Focus Mode keeps its own deeper backdrop. Honor `prefers-reduced-motion` and `prefers-reduced-transparency`; 44px targets.
- Wording and copy are placeholders; do not rename labels while iterating on visuals.

## Where the styling lives

- `design-tokens.css`: font and legacy tokens.
- `styles.css`: the original base stylesheet. **Do not add override layers here.**
- `exe-ui.css`: the single source of truth for the glass look (tokens, canvas, surfaces, mobile dock, desktop shell, Focus, Inbox, sheets, Focus Mode, fallbacks). **Edit it in place; do not stack "phase" overrides at the end of a file.**

## References

- Owner-supplied crops in `assets/design-reference/` (`owner-desktop-focus.jpg`, `owner-mobile-focus.jpg`) and the approved mockups (`approved-floating-capture-and-inbox.webp`, `approved-light-glass-navigation.webp`). Follow `assets/design-reference/README.md` for precedence. Where the references and this file differ, this file wins, as it records later owner decisions.
- Treat reference images as design direction, not proof that code exists or work is complete.

## Quality and process

- Mobile Safari browser experience is first-class. Verify iPhone Safari, 320–430px viewports (and 481–760px wide phones), keyboard and safe areas, keyboard accessibility, and reduced motion/transparency. Require mobile/desktop functionality parity.
- Use a feature branch, tests, real screenshots, and a PR for each phase. Do not silently redesign the interface. Obtain user review before major visual changes or deploys.
- Before restyling, snapshot computed styles for the key screens and diff after, so only intended changes ship.
