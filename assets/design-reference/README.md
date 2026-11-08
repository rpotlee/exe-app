# Exe V1 — Approved visual references

These are **approved visual direction references**, not implemented screens, live data, or evidence that any task is complete.

- [approved-floating-capture-and-inbox.webp](approved-floating-capture-and-inbox.webp): establishes the distinct elevated cobalt Quick Capture (+), raw checkable Inbox, and polished mobile/desktop layout.
- [approved-light-glass-navigation.webp](approved-light-glass-navigation.webp): later visual refinement establishing a subtle, translucent/frosted-glass floating bottom navigation dock, refined card depth and spacing.

Both image assets are faithful full-resolution copies of the approved mockups, converted to high-quality WebP for the repository.

## Reference precedence and consistency

1. **Workflow and feature requirements**: AGENTS.md and V1-LOCKED-SPEC.md override any cosmetic or fictional UI text in a mockup.
2. **Latest visual refinement**: approved-light-glass-navigation.webp controls the dock treatment (subtle glass).
3. **Layout and content relationships**: approved-floating-capture-and-inbox.webp controls the separation of the Quick Capture action from the raw Inbox and desktop/mobile look.
4. **Functional mobile navigation** must display all five destinations: Focus, Inbox, AI Review, Map, Decisions, and the separate elevated Quick Capture +. A mockup may omit one or substitute a label due to image-generation limitations; do not remove the destination.
5. **Mission Status** remains the compact dashboard heading, without a top metrics row. Display actual state; mockup counts/progress are illustrative.
6. The browser-mobile experience is a first-class web UI; safe areas, touch targets, keyboard behavior, readable text and stable fixed/floating navigation are required.

Before implementing visual changes, inspect both images and compare actual rendered desktop and mobile browser screenshots. Do not redesign the established Exe workflow or architecture.

## Owner-supplied crops (current build target)

- [owner-desktop-focus.jpg](owner-desktop-focus.jpg): desktop Mission Status crop (sidebar, ring, checklist, priority rows).
- [owner-mobile-focus.jpg](owner-mobile-focus.jpg): mobile Mission Status crop (bell with dot, glass dock with the + embedded between two tabs on each side).

The owner directed that these crops, not the written spec, drive the build wherever they differ. In the mobile crop the fourth dock tab is drawn with the Map icon but labelled "AI Review"; it is implemented as **Map**, and AI Review is reached from the header bell.
