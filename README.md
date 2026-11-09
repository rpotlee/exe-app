# Exe — Personal Execution System

Write everything on your mind as a plain to-do list. Exe (optionally, with your own AI key) finds what belongs together, what has to happen first, and where it can help: an email draft to copy, official sources to check, a quick answer. Then it shows you the few things to work on now, and why.

**Status: an actively developed production prototype.** Sign-in, saving, offline queue, AI functions, and the Cloudflare deployment are built; real-device and multi-user coverage is still limited.

## How it works

- **Inbox:** a raw, checkable to-do list. Works with no AI.
- **AI Review:** suggestions to organize captures; nothing changes until you approve.
- **Map / Decisions / Focus:** folders, outcomes, steps, blockers and decisions; at most three active priorities, ranked by explainable rules.
- AI is optional and bring-your-own-key (Anthropic, OpenAI, Google Gemini, or Groq). Keys are stored encrypted on the server and never reach the browser again.

Help for users is in the app's help center (`/support/`, built from `support/pages.mjs`).

## Run it

```bash
npm install
npm run dev            # http://localhost:5173 ; add ?local=1 to run on this device only, with no account
npm run build          # builds the help pages and the site into dist/
npm test               # types, unit tests, database rule tests
```

Copy `.env.example` to `.env` and fill in your Supabase project's public URL and anon key to use sign-in and cloud saving. Never put a service-role key in `.env` or in the browser.

## Layout

- `web/` the React app · `src/` shared domain logic, stores and generated database types · `supabase/` migrations, tests and edge functions
- `ui-kit/` the design system (Apple HIG based) · `support/` help-center content · `test-data/` sample files for Settings → Import
- `CURRENT_STATE.md` active architecture and deployment brief · `docs/EXE_EXECUTION_PROTOCOL.md` change/verification protocol · `DECISIONS.md` approved decisions · `AGENTS.md` engineering guardrails
- `HANDOFF.md` historical phase log; use `CURRENT_STATE.md` for the current state
- `index.html`, `app.js`, `styles.css` are the original single-file prototype, kept for reference.

## License

Copyright © the Exe authors. All rights reserved: you may read the code, but no license to copy, modify or redistribute it is granted unless one is added to this repository. The Inter font in `design-master/fonts/` is © its authors under the SIL Open Font License (see `design-master/fonts/OFL.txt`).
