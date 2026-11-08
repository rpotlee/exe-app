# Accessibility

- **Contrast.** Body text 4.5:1 or better on its named backgrounds in Light and Dark; the Light increased-contrast theme (`light-hc`) pushes text toward black and separators toward 3:1. Large text 3:1.
- **Color-independent.** Blocked = lock + "Blocked"; Decision = fork + "Decision needed"; Ready = check + "Ready"; AI = sparkle + "Suggested". Selected = tint plus a ring or check.
- **Targets.** 44x44pt minimum (`hit`), 8pt between neighbors.
- **Dynamic Type.** All text uses the style tokens; test at the largest accessibility size; rows wrap, chips wrap, the tab bar shows labels at larger sizes by moving to the sidebar or showing icon + label in a grid.
- **VoiceOver.** Icon-only buttons get labels (Settings, AI Review, 3 suggestions). Tabs expose selected state. Checkbox rows announce "Completed / Not completed". Reading order = visual order.
- **Motion.** Honor Reduce Motion; no auto-playing animation; no parallax.
- **Focus.** Visible `tint` focus ring (3px) for keyboard and pointer navigation on iPad/Mac.
- **Input.** Support dictation, external keyboards (⌘K capture, ⌘N, Esc closes sheets), pointer hover on Mac/iPad.
- **Undo.** Destructive or bulk results are undoable (shake or ⌘Z) and archived rather than erased.
