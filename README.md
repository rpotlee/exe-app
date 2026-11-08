# Exe — Personal Execution System

Write everything on your mind as a plain to-do list. Exe (optionally, with your own AI key) finds what belongs together, what has to happen first, and where it can help: an email draft to copy, official sources to check, a quick answer. Then it shows you the few things to work on now, and why.

**Status: a working prototype, not a finished product.** Sign-in, saving, offline queue and the AI functions are built; the AI help has been tested only against a fake AI so far, and the app has not had a real-device or multi-user trial.

## How it works

- **Inbox:** a raw, checkable to-do list. Works with no AI.
- **AI Review:** suggestions to organize captures; nothing changes until you approve.
- **Map / Decisions / Focus:** folders, outcomes, steps, blockers and decisions; at most three active priorities, ranked by explainable rules.
- AI is optional and bring-your-own-key (Anthropic, OpenAI or Google Gemini). Keys are stored encrypted on the server and never reach the browser again.

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
- `DECISIONS.md` why things are the way they are · `HANDOFF.md` current state · `AGENTS.md` engineering guardrails
- `index.html`, `app.js`, `styles.css` are the original single-file prototype, kept for reference.

## License

Copyright © the Exe authors. All rights reserved: you may read the code, but no license to copy, modify or redistribute it is granted unless one is added to this repository. The Inter font in `design-master/fonts/` is © its authors under the SIL Open Font License (see `design-master/fonts/OFL.txt`).
