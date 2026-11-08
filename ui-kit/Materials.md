# Materials

Two layers. Never mix them.

| Layer | What goes there | Surface |
| --- | --- | --- |
| Content | Cards, lists, sheet bodies, banners, text | Opaque `background-*` / `grouped-*`. Structure from standard materials only when needed: `material-thin`, `material-regular`, `material-thick`. |
| Controls | Tab bar, capture bar, toolbar buttons, floating buttons | Liquid Glass: `glass-fill` + backdrop blur 24px + saturate 1.8 + `glass-edge` 1px + `shadow-float`. |

- **Regular glass** is the default (reads over anything). Use **clear glass** only over rich photo or media backgrounds, with a 35% `scrim`.
- Color on glass: tint the *background* of the one primary control (`tint-fill`); symbols and text stay `label`. Never tint several glass controls.
- Glass adapts to light/dark on small elements; large glass (sidebar) is more opaque: use `material-regular`.
- Fallbacks are required: with Reduce Transparency, glass becomes opaque `grouped-secondary`; without `backdrop-filter`, use `glass-fill` alone at higher opacity.
- Sheets: opaque `background` with `radius-xl` top corners, `shadow-sheet`, grabber, and medium/large detents.
- Shadows: `shadow-card` is nearly invisible in light, absent in dark (surface steps carry elevation). `shadow-float` is only for glass.
