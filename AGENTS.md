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

- **Default theme (owner direction, 2026-11-08): a clean white canvas with cards that float through shadow alone.** The steel-blue canvas was tried and rejected. Ordinary cards are white with a faint gradient, no outline, and large soft blue-tinted layered shadows (a tight contact shadow plus a long soft one) so they look lifted off the page; very round corners. The current-priority card is **pearl optical glass** (owner direction, 2026-11-08): a nearly opaque neutral surface, soft layered neutral shadows, a narrow masked silver-white rim, and a restrained accent light on the left edge only. The light's color is `--exe-priority-accent`, set from the priority icon's *rendered* color by `syncPriorityGlassAccent()` (`web/ui/pearl.ts`, mirrored in `app.js`; call it after the card renders and when the active priority changes, no observers). Never hard-code a separate color for it. See `exe-ui.css`. The mobile dock is a dark graphite bar with visible labels, floating on a layered shadow. Action buttons are flat cobalt. The deep dark theme remains as an alternate (`?theme=dark`). Text on the canvas must keep at least 4.5:1 contrast.
- Cobalt is the single accent, used for actions and the active state. Red is for verified blockers only.
- **Glass recipe:** backdrop blur with saturation, a translucent fill, one 1px bright edge, a faint top specular highlight, and a soft ambient shadow. Keep it restrained: no stacked bevels, no colored glows, no glossy gradients, and no loud or "goofy" saturated backdrops.
- **True glass refraction is a Chromium-only progressive enhancement** (`REFRACT` in `app.js`): an SVG displacement map, generated to each element's exact rounded shape, is applied as `backdrop-filter: url(#...)` on the current-priority card only (the dock is plain graphite). Safari (including every iPhone browser) and Firefox cannot do this and keep the blur-only glass, which must always look right on its own. Never apply `filter: url()` to a card; it would distort its content. Content slides dimmed under the dock (scroll mask) and the dark backdrop has crisp rings and discs so there is something to bend.
- **All theme colors are tokens at the top of `exe-ui.css`** (one set for dark, one for light). Components must use tokens, never hard-coded theme colors.
- Concentric radii: 28 (cards), 20 (rows and fields), 16 (buttons and inner panels), 24 (dock), pill (chips).
- Typeface is Inter (bundled in `design-master/fonts/`, loaded in `design-tokens.css`).
- **Focus Mode** keeps its own deeper, warmer smoky-glass backdrop in both themes, so entering it still reads as a change of state.
- Readable darker secondary text, accessible contrast, 44px touch targets, honor `prefers-reduced-motion` and `prefers-reduced-transparency`.
- Wording and copy are **placeholders** pending a full copy pass after the design is settled. Do not rename labels while iterating on visuals.

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
