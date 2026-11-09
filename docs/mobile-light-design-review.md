# Mobile light design review

This review implements the owner's request for a cohesive redesign of mobile light mode. It is a local review candidate; it has not been deployed.

## Design reasoning

The prior interface gave similar visual weight to the logo, page heading, segmented capsule, glowing capture field, list card, floating dock, and center plus button. Mixed blue and purple treatments further obscured the distinction between content and controls. These are design hypotheses based on inspection, not findings from a user study.

The redesign uses proximity and consistent alignment to make related information easier to scan. Reminder dates sit beneath their titles at a readable 12px, with compact labels such as “Tomorrow · 9:00 AM.” Cross-year reminders retain their year. A muted teal marks actions and selection; priority colors keep their existing meaning.

Apple's guidance on hierarchy, harmony, and consistency informed the separation of opaque content from the floating navigation layer: [WWDC25 Platforms State of the Union](https://developer.apple.com/videos/play/wwdc2025/102/). This is an independent web implementation, not a native Apple component or an exact Liquid Glass reproduction.

## Visual system

- Neutral canvas `#f6f7f9`, white content, graphite ink `#20272d`.
- One teal action family: `#21766b`, with a pale selected state.
- System typography: 30/35px page titles, 15/21px task rows, 12/17px reminder metadata, 16px editable fields.
- 19px rounded-square checkboxes; surrounding task labels retain large tap areas.
- Balanced symbols on one 24px grid; 20px utility icons and 21px navigation icons.
- Four labeled navigation destinations, with a separate 54px capture action.
- Content cards have subtle boundaries and no floating shadows. Blur is reserved for the navigation surface.
- Mobile light rules are grouped in section 4 of `exe-ui.css`. Dark and desktop keep their existing visual styling.

## Verification

- Build and TypeScript check pass; 173 unit tests pass.
- Inspected populated List, task filter, Notes, Reminders, Status, All tasks, and task assistant. Activity currently has no events, so only its empty state was visually verified.
- Inspected Capture, Folders, Settings, Search, and the inline type menu.
- Checked horizontal layout at 320, 390, 430, 600, and 760px. No page overflow observed. At 320px, navigation targets remain approximately 50px wide; capture and submit targets remain at least 44px.
- Confirmed the actual TaskScreen selectors (`.t-text` and `.t-check input`) resolve to 15px text and 19px checkboxes.
- Retained reduced-motion handling and added explicit mobile-light increased-contrast and reduced-transparency rules.
- Browser checks use the local preview. Physical iPhone Safari keyboard and safe-area behavior still warrant device review.

## Screenshots

- [Reminders](../artifacts/mobile-light-review/reminders-390.png)
- [Status](../artifacts/mobile-light-review/status-390.png)
- [All tasks](../artifacts/mobile-light-review/tasks-390.png)
- [Capture](../artifacts/mobile-light-review/capture-390.png)
- [Search](../artifacts/mobile-light-review/search-390.png)
- [Assistant](../artifacts/mobile-light-review/assistant-390.png)
