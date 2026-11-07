# Exe engineering guardrails

- **Read `V1-LOCKED-SPEC.md` before making code changes.** Product architecture, entities, and functional workflows are frozen. Do not replace them or introduce a new methodology.
- The baseline is a **prototype**, not a deployed or fully functional AI application. Do not claim otherwise.
- Mobile Safari browser experience is first-class. Five labeled destinations: Focus, Inbox, AI Review, Map, Decisions. Separate, always-accessible floating + for Quick Capture.
- Focus heading is `Mission Status`. No top metrics row. One current priority plus two other active Now priorities. Never show fabricated progress.
- Inbox opens immediately to a **raw, editable, checkable to-do list**; raw Capture completion remains distinct from AI review status and structured Task completion.
- AI recommendations require user approval. No silent merging, reclassification, deletion, blocker creation, task completion, or priority promotion.
- Maintain at most three active Now priorities. Show clear, explainable priority logic and dependency types.
- Approved visual direction: premium clean **light** appearance, cobalt/navy accents, readable darker secondary text, subtle card boundaries, calm depth, slight translucent blur on floating mobile navigation, red blocked signals. Avoid deep dark modes, green branding, clutter, low contrast and unnecessary elements.
- Require mobile/desktop functionality parity and accessible interactions. Verify iPhone Safari, 320–430px viewports, keyboard/safe areas, keyboard accessibility and reduced motion.
- Keep credentials on secure backend only. Implement authentication, persistent storage and cross-device sync in later scoped phases.
- Use a feature branch, tests, real screenshots, and a PR for each phase. Do not silently redesign the interface. Obtain user review before major visual changes or deploys.
