# Pre-implementation visual discrepancy audit

Both approved WebP images and their precedence document were inspected. Actual current browser screenshots and DOM geometry were recorded before edits in this directory. Reference measurements use the visible app UI, excluding decorative device frames/background. Perspective and occlusion make reference measurements approximate; they are calibration guides, not exact CSS measurements.

| Area | Severity | Current discrepancy/evidence | Reference target / exact correction |
| --- | --- | --- | --- |
| CSS system | Major | Two linked sheets, repeated root palettes and stacked Phase 1/V2 rules; visual values differ by screen | One component stylesheet and one token source; merge repeated selectors within each condition, remove obsolete Focus/Inbox/nav overrides and use shared semantic tokens |
| Supporting progress | Major | `.mini-progress-track` is inline; authored width/height do not create the visible track in mobile screenshots | Explicit block track, 56×5px mobile; fill from existing calculated percentage, including visible empty track at 0% |
| Ring typography | Moderate | `Manrope` without a fallback yields serif percentage numerals | Single inherited system sans font token on percentage, caption, title and controls |
| Capture/dock integration | Major | 390px capture 54px, 14px clear gap above 72px dock | Shared geometry: 60px circle, 88px capsule, circle emerges 24px into dock top. All five 56px-high targets start below circle. Document extra dock height needed for five labels |
| Mobile Focus surface | Moderate | Card almost white and weakly separated, icon/title/ring weights differ | Subtle cool raised surface, two soft shadow layers, 1px boundary; 70px ring, coherent cobalt icon tile and button |
| Mobile Focus card | Moderate | At 390px card x18, y161, 354×266px; reference UI crop suggests ~94% width | 14px side inset (362/390px), calibrate top offset/card content and ring against cropped reference; retain real title/steps |
| Supporting priorities | Moderate | 76px rows, no visible bars, percentage isolated at right | 72px baseline cards, 40px icon tile, 14px title, 12px subtitle, percentage plus visible 5px track; one consistent border/shadow |
| Desktop geometry | Moderate | Sidebar 238px; card x287, width880px; title wraps after “business” | Sidebar208px; content begins at256px; Focus column680px; title max300px to reproduce two-line hierarchy, aligned subordinate cards |
| Desktop header | Moderate | 81px top strip adds large empty band above heading, several status/control treatments | Compact64px utility header, aligned content inset48px; preserve Search, settings and capture access |
| Canvas/depth | Moderate | Near-white canvas and low-depth surfaces look flatter than approved light cool-tint reference | Off-white cool canvas, white/very lightly tinted elevated cards, shared two-layer shadow scale; no decorative device imagery |
| Inbox | Minor | Correct checklist structure, but control treatments and separators not from a single system | Retain compact 16px rows; shared hairline, checkbox, pill filter, overflow, and input tokens. No repeated metadata |
| Other screens/dialogs | Moderate | Multiple font/color/radius/spacing values unrelated to calibrated Focus | Apply shared card/control/text/spacing/elevation tokens to existing layouts without changing their structure |
| Interaction feedback | Moderate | Mixed focus colors, hover translations and inconsistent pressed/disabled styles | Shared 3px focus ring, quiet color/elevation hover/pressed feedback, disabled opacity/cursor; preserve reduced-motion rules |
| Functional differences | Explained | Mockup uses fictional 50/33/25%, “Next priorities,” and sometimes omits navigation labels | Keep calculated 0% initial progress, “Other active priorities,” all five labels, original data and the existing Next/Later entry |

No application code was changed before this audit. Visual verification will record pass 1 findings and pass 2 corrections separately. Final acceptance is based on inspected rendered screenshots and documented differences, independently from automated functional checks.
