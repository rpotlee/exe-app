# Exe design master — component specification

Status: coded appearance reference for approval, not approved application integration. [Rendered screens and comparisons](README.md). This directory is independent of the current application stylesheet and JavaScript.

## 1. Source inspection and precedence

All four supplied image files were inspected. Both SVGs consist of an `<svg>` with a single embedded WebP `<image>`; they contain no editable UI paths, text, font names or component coordinates. The embedded bytes match the corresponding WebP exactly:

| Source pair | Dimensions | Embedded WebP SHA-256 |
| --- | --- | --- |
| `approved-light-glass-navigation.svg` / `.webp` | 1536 × 1024 | `59590beeb5c9cf95a6cce42b05d6c8b8c2983a12c3198c9a296dfa463ed6b2b7` |
| `approved-floating-capture-and-inbox.svg` / `.webp` | 1448 × 1086 | `b07d41f95c8e8ee25b0270bad4efb2ef92a0449972a9929ffc569ec2b854728e` |

Light-glass defines tint, type hierarchy, elevation, hairlines, overflow and glass treatment. Floating-capture defines separate capture/dock, three-priority relationships, filters and desktop/sidebar composition. The locked specification resolves missing labels, fictional completion and example data conflicts.

Reference UI crops, in original image pixels:

| Crop | x1,y1 → x2,y2 | Comparison normalization |
| --- | --- | --- |
| Latest mobile Focus | 640,118 → 1037,892 | 397px-wide visible UI normalized to 390px |
| Latest mobile Inbox | 1092,118 → 1489,892 | Same visible UI scale |
| Floating mobile Focus | 615,260 → 970,922 | 355px-wide UI normalized to 390px; different illustration viewport height retained as a documented source difference |
| Floating desktop visible left UI | 45,118 → 577,755 | Visible157px sidebar normalized to 208 CSS px; camera/device crop cannot reveal the occluded right side |

`compare.py` creates labeled side-by-side images from those crops and the actual browser screenshots. No reference pixel is used by the three rendered screens. No claimed similarity percentage is derived from differing text/progress.

## 2. Fixed rendering contract

- Browser: Chromium; device scale factor1; light scheme; reference screenshots at 390×760 and1280×840 CSS px.
- Font: **Inter variable**, self-hosted as `fonts/InterVariable.ttf` under SIL OFL. Family alias `Exe Inter`, optical sizing auto, weights100–900. [Provenance, license and checksum](fonts/README.md).
- The reference's exact original typeface cannot be recovered from the raster/SVG wrappers. Inter is the explicitly selected and pinned coded-master face, not a claim that its identity was embedded in the source.
- No platform-default UI-font dependency: the environment otherwise resolves its UI family to OpenAI Sans, which altered previous letter widths. The master waits for the local font before capture.
- One CSS pixel corresponds to one evidence pixel. Safe-area environment values are0 in these desktop Chromium captures; CSS includes their integration points.

### Typography

| Role | Mobile size / line / weight | Desktop size / line / weight |
| --- | --- | --- |
| Exe identity | 26 /26 /750 | 30 /30 /750 |
| Mission Status / Inbox | 37 /44 /750, tracking−1.65px | 38 /46 /750, tracking−1.35px |
| Status / subtitle | 16 /22 /400 | 16 /22 /400 |
| Current-priority title | 20 /23 /750, tracking−.65px | 26 /28 /750, tracking−.9px |
| CURRENT PRIORITY | 12 /14 /750 | 11 /14 /750 |
| Workstream | 13 /18 /400 | 13 /19 /400 |
| Actionable checklist | 16 /21 /450 | 15 /21 /450 |
| Enter Focus Mode | 18 /normal /550 | 20 /normal /550 |
| Other active priorities label | 20 /24 /650 | 11 /16 /750, uppercase, .8px tracking |
| Supporting title / subtitle | 14 /17 /700; 13 /17 /400 | 18 /22 /700; 14 /17 /400 |
| Raw checklist | 16 /22 /400, tracking−.35px | Not a requested desktop Inbox master |
| Dock labels | 10 /13 /500; selected650 | Not applicable |

A semantic `<br>` locks the current title to the approved two-line relationship without changing its wording. The mobile actionable row reserves46px for the disclosure control and caps its text column at225px so “filing status” wraps together onto the second line.

### Color, radius and elevation

Exact values live in [tokens.css](tokens.css):

| Role | Value |
| --- | --- |
| Canvas / surface / raised cool surface | `#f8f8ff` / `#ffffff` / `#f6f6ff` |
| Primary / secondary / tertiary text | `#0e1020` / `#42485d` / `#566079` |
| Cobalt / lower gradient / selected ink | `#2039f4` / `#1023d9` / `#1825ca` |
| Icon tile / progress track | `#ebebff` / `#dedff4` |
| Card boundary / row hairline | `#dcdeed` / `#e0e1ee`, 1px |
| Checkbox boundary | `#68718b`, 1.2px |
| Blocked text / surface | `#b42339` / `#fff0f2`; not shown without an authoritative blocker |
| Hero radius | 16px mobile,15px desktop |
| Secondary card / control / glass radius | 13px /10px /22px |
| Checkbox radius | 4px |
| Card shadow | `0 5px 14px rgb(34 32 88 /9%), 0 2px 3px rgb(34 32 88 /5%), inset 0 1px 0 #fff` |
| Secondary shadow | `0 2px 6px rgb(34 32 88 /7%), inset 0 1px 0 #fff` |
| Cobalt shadow | `0 4px 9px rgb(31 40 192 /19%), inset 0 1px 0 rgb(255 255 255 /22%)` |
| Dock shadow | `0 8px 24px rgb(28 42 89 /11%), inset 0 1px 0 rgb(255 255 255 /85%)` |
| Glass | white82%, blur18px, saturation1.2, `rgb(208 211 232 /85%)` edge |

The spacing primitives are4/8/12/16/20/24/32px. Source-measured exceptions are explicit component geometry:14px text inset,6px card outset,22px horizontal hero padding,10/12px grid gaps,18/20/24px section relationships. There is no inherited application cascade.

## 3. Component geometry and alignment

[MEASUREMENTS.md](MEASUREMENTS.md) is generated from actual DOM bounds, not manually asserted estimates. Full computed font/color/radius/shadow values are in [measurements.json](evidence/measurements.json).

Mobile390px contract:

- Header48px; brand at 16,11. Main text inset14px; heading starts at 14,62.
- Current card at 8,152, size374×267. It deliberately extends6px beyond each text inset. Its22px horizontal padding preserves the inner content column.
- Hero icon visual tile52×52 occupying a42px grid slot with10px left outset. Title starts at 85,193. This reproduces the wider tile versus narrower title column without shrinking text.
- Ring70×70; zero completion produces only the track, with real0%/0-of-3 text.
- Actionable row64px; checkbox20×20. CTA328×48 at 31,354.
- Other label starts at 14,439. Secondary cards374×64,8px apart. Visual icon tiles44×44; title/subtitle and56×5px track share a stable column arrangement.
- Inbox: filters362×36 at 14,150; inline Add362×46 at 14,202. Hairline rows begin at 14,262. Row height is intrinsic: the real first capture needs91px; short one-line entries use52px.
- Dock370×88 at 10,660. Capture68×68 at 161,616; circle extends24px into dock top. All five56px-high targets start below the circle. Label centers share a baseline.
- Content viewport ends8px above the capture circle. Both subordinate cards fit the initial Focus screen. Long Inbox lists scroll inside the clear region.

Desktop1280px contract:

- Sidebar208px wide and840px tall. Content text/card left236px:28px inset after sidebar. Main column472px wide.
- Heading at 236,54; current card at 236,152, size472×390. The complete real three-step checklist replaces the illustration's four partly completed rows.
- Header icon tile58×60; title26px/28px; ring84×84. CTA316×52 at 257,469.
- Supporting cards472×72 with8px stack gap, within the same column. Search/Settings and workspace switch sit at the sidebar bottom.
- The remainder of the1280px canvas stays plain. No inferred right-side dashboard, metrics or invented controls are added to fill occluded reference space.

Calibration examples: the latest mobile reference card is approximately 375×270 CSS px after crop-width normalization; the master is374×267. Its ring normalizes to approximately 70px; the master is70px. The visible desktop reference card353px wide becomes467.7px when its157px sidebar is normalized to 208px; the master is472px (+4.3px). Raster edge/perspective measurements are approximate; the coded master dimensions above are exact.

## 4. Revisions and verification

1. Initial standalone render: pinned the font, separated source UI from device imagery, established all three semantic screens. Initial screenshots and measurements remain in `evidence/iteration-1/`.
2. Compared UI crops and corrected actionable wrapping, CTA/secondary/desktop type sizing, desktop button width/height and title/icon allocation.
3. Corrected source-measured6px card outsets and icon tile proportions, enlarged capture to 68px while retaining all five targets, and checked complete supporting-card visibility and scroll clearance. Final screenshots were re-rendered and measurements regenerated.

`verify.py` checks local font readiness, no application asset dependency, no JavaScript errors, zero checked state, real0% labels, five destinations, >=44px navigation targets, capture/target separation, clear content bounds, both secondary cards visible, and temporary native checkbox/disclosure interaction. It also asserts no diff outside `design-master/` from application commit `399359e`. No application regression suite was changed or rerun because no application code changes are in scope.

## 5. Remaining discrepancies — explicit, not hidden

| Difference | Why retained / effect |
| --- | --- |
| Source typeface/vector geometry is unknowable | Both SVGs embed the WebPs. Inter and authored SVG line icons are a reproducible, calibrated implementation choice; subtle letterform/antialiasing differences remain |
| Real0%,0-of-3 and no checked seed tasks | Locked initial state overrides fictional50/33/25% and checked rows. Progress tracks are visible but empty |
| Real18 original captures and longer wording | Rows naturally wrap; fewer fit than the illustration's short fictional seven-entry list. No text is replaced, truncated or silently reorganized |
| Visible All/Active/Done and inline entry | The latest glass image omits filters. Floating-capture layout plus the locked spec requires them; they add a36px row and spacing |
| “Other active priorities,” actual workstreams | The mobile mockups say “Next priorities” and sometimes use “Market strategy.” The three actual Now priorities and existing Market & pricing workstream take precedence |
| Five destinations with separated center action | Some illustrations omit a label or place the circle over AI Review. The master uses an88px bar,24px circle intersection and a row below it, preserving five labeled targets without obscuring content |
| Notification dot/badges absent | The existing example has zero pending AI reviews; no fake pending count is copied |
| Source UI edges and desktop extent are partly occluded/perspectival | Coordinate crops and normalization are documented. Desktop height840px reflects the visible UI proportions; blank right-side canvas is not invented content |
| Static reference controls | Only reference-page navigation, native checkbox and disclosure states are interactive. Filters, Edit/Archive, capture and other route buttons do not implement application workflows. Integration must retain the actual app's behavior after visual approval |
| Browser/device differences | Captures use Chromium at DPR1. No physical iPhone Safari, actual keyboard/browser chrome, VoiceOver or cross-device behavior is claimed |

**Stop at appearance review. Do not apply these files to the application, merge PR #1, deploy, or begin Phase 2 without a subsequent instruction.**
