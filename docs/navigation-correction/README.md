# Actual navigation correction

[Reference → previous actual app → corrected actual app](comparison.png). All actual dock close-ups have Focus selected; image widths are normalized without stretching their heights.

| Detail | Previous | Corrected |
| --- | --- | --- |
| Capsule height | 90px | 84px |
| Horizontal inset | 12px | 4px |
| Bottom offset | 14px + safe area | 8px + safe area |
| Capture circle | 64px | 68px, soft rim/highlight and layered shadow |
| Circle intersection | 26px | 18px; leaves every navigation target clear |
| Active highlight | Whole tab cell | Centered 50px lavender pill |
| Icons | 21px | 24px, 1.65 stroke |
| Labels | 10px | 11px; charcoal600 / selected cobalt700 |
| Glass | Unprefixed blur | Standard and Safari-prefixed18px blur, subtle gradient, saturation1.2, crisp edge and inner highlight |

Sidebar labels/icons are also calibrated to16px/22px. All five mobile destinations, minimum44px targets, actual counts, capture context and content clearance remain intact. The latest mockup's literal circle placement would obscure a destination, so the five-destination floating-capture composition controls that spacing.

Verification: eight-width functional regressions,26 axe audits, disclosure/context/safe-area/reduced-viewport checks passed. `tests/navigation_geometry.py` additionally checks the final four mobile sizes and exact geometry/type/selection/glass contracts. `tests/navigation_capture.py` reproduces this comparison from the actual application and its previous CSS revision. No standalone replacement UI is used.

[Full actual-app screenshots](../visual-conformance/navigation-correction/). No application behavior or data changes. Real iPhone Safari remains unverified; no merge or deployment.
