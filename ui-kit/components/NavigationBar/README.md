The navigation bar shows the screen's large title and at most two glass buttons.

**Native counterpart.** SwiftUI `.navigationTitle("Mission Status")`, `.navigationBarTitleDisplayMode(.large)`, `ToolbarItem` with `Image(systemName: "bell")`.

**Rules.**
- Large title only on the five root screens, collapsing to an inline headline while scrolling. Title names the screen, never the app.
- Trailing buttons: AI Review bell (with count in a badge) and Settings. Label them for VoiceOver.
- Do not tint toolbar glyphs for decoration; use `label`.
