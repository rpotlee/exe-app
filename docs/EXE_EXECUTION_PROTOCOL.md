# Exe execution protocol

This is the working protocol for building, revamping, and refining Exe.

## Before editing

1. Read `CURRENT_STATE.md` and `AGENTS.md`.
2. Identify the deployed implementation and every screen/service affected.
3. Search for parallel implementations before changing a behavior.
4. Write down the acceptance criteria and explicit non-goals.

## While editing

- Prefer the smallest shared fix that preserves the locked architecture.
- Keep light and dark themes structurally identical.
- Keep user-visible behavior explicit and reversible; do not infer silent
  automation from a visual request.
- Do not stack temporary CSS override layers when the source rule can be fixed.
- Do not mix unrelated cleanup, redesign, migrations, or provider changes into
  the same slice.

## Before reporting completion

- Run typecheck, unit tests, build, and `git diff --check`.
- For UI work, exercise the affected flow at mobile and desktop sizes in both
  themes, including keyboard/focus behavior where relevant.
- For cross-screen behavior, verify each screen independently.
- For AI work, verify request admission, cooldown/error handling, provider/model
  configuration, and that no key or prompt is logged or exposed.
- For deployment work, verify the production commit and smoke-test the live URL.
- Report succeeded, failed, unverified, and user-required actions separately.

## Request shape that minimizes rework

When a request is broad, capture it as:

- Goal
- Affected surfaces
- Exact behavior or visual change
- Acceptance criteria
- Non-goals
- Verification target (local, preview, or production)
