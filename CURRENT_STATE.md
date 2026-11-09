# Exe current state

This is the active project brief for implementation work. Historical handoffs and
phase notes remain useful for context, but they do not override this file,
`AGENTS.md`, or an explicit owner decision in the current request.

Last reviewed: 2026-11-09

## Product and architecture

- The production app is the React/Vite app under `web/`, using domain logic in
  `src/` and Supabase persistence/Edge Functions under `supabase/`.
- The original root prototype (`index.html`, `app.js`, `styles.css`) is retained
  for reference and is not the production implementation.
- Product behavior is frozen by the current decision/spec files. Do not change
  business rules or architecture during a visual or bug-fix request.
- AI is optional, user-owned-key, and server-mediated. Supported providers are
  Anthropic, OpenAI, Google Gemini, and Groq. Never expose a key or store it in
  browser code.

## Production and deployment

- Production URL: https://exe-app.buildaltr2026.workers.dev/
- Hosting: Cloudflare Workers, production service `exe-app`.
- Deploy source: merged commits on `main`.
- Supabase project ref: `ifwzslpfxgwfgtyduyuo`.
- A deployment is not complete until the production deployment shows the
  intended commit as Ready and the affected flow is smoke-tested.

## UI source of truth

- Shared visual rules live in `exe-ui.css` and `ui-kit/`.
- Light and dark themes share structure, geometry, spacing, typography, and
  interaction states; only theme values change.
- Cards and rows are opaque. Glass treatment is reserved for floating controls.
- Mobile Safari at 320–430px is a first-class target, alongside desktop.

## Required verification

For code changes, run the narrowest relevant checks and then the full baseline
before deployment:

```bash
npm run typecheck
npm run test:unit
npm run build
git diff --check
```

For a user-visible change, also verify every affected screen, light and dark
themes, and the production deployment. For a cross-screen behavior, test the
shared interaction in every screen that renders it rather than assuming one
implementation covers the others.

## Known maintenance debt

- `HANDOFF.md` contains historical phase notes and should not be treated as the
  current architecture summary.
- The original prototype and the React app coexist; changes must identify which
  one is deployed before editing.
- Browser acceptance coverage should continue to grow around cross-screen
  behavior, theme parity, AI request admission, and mobile Safari flows.
