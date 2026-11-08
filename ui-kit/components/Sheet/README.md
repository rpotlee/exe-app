Sheets host a scoped task: Quick Capture, edit, split, compare.

**Native counterpart.** SwiftUI `.sheet` with `.presentationDetents([.medium, .large])`, `.presentationDragIndicator(.visible)`.

**Rules.**
- Cancel leading, primary trailing; never Cancel + Done + Back together. Swipe-down dismisses; confirm if text would be lost.
- Grabber shown; medium detent for capture, large for split/compare. One sheet at a time.
