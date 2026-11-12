# Proactive AI Execution Engine: local implementation report

Status: local code complete for explicit analysis and controlled assistance. Nothing here has been deployed or run against a paid provider.

## Implemented

- One database admission path now enforces owner, system, and provider token/request limits; owner and system daily token/estimated-cost ceilings; priority for recent interactive work; fenced leases; cooldowns; and a sanitized usage ledger with latency. Per-model prices are configurable. Unknown models use a conservative fallback estimate.
- Explicit organization analysis creates a durable, deduplicated job. A lease fences concurrent requests, retries back off, and a database function checks all source revisions and saves validated suggestions atomically. Saved suggestions restore across devices after refresh. Results remain proposals; approved Groups become Outcomes in Later, and proposed dependencies remain unconfirmed.
- An additive Groups graph indexes detected membership and capture dependencies when that same analysis record is inserted. The existing `missionGroups` projection and `groupCaptures` approval command remain the single grouping path. The Status destination now presents compact Groups cards with completion, remaining count, update time, and permanent Ungrouped; old Status URLs still resolve.
- Model routing can use a separately chosen analysis model with the same provider and key. Interactive assistant requests continue using the user's primary model. The selected model is checked again at admission.
- List uses deterministic opportunity labels and the existing per-entry assistant. Opening the panel restores saved work without provider traffic; the old browser-only help path is no longer mounted. The demo also waits for an explicit Prepare help click. The existing assistant registry excludes external and workspace mutations, and the server validates issued actions.
- Activity records server-saved analysis and existing user approvals. Settings shows per-user request/token/estimated-cost usage for the UTC day. The List opportunity chip has a build flag; background processing remains disabled by default.

## Schema and principal files

- Migrations: `supabase/migrations/20261110000015_ai_execution.sql` adds `ai_limits`, `ai_provider_limits`, `ai_global_admission`, `ai_model_rates`, `ai_usage`, `ai_jobs`, `ai_intelligence`, `user_ai_settings.analysis_model`, extended `ai_admission`, and service-only claim/save/admission functions. `20261110000016_ai_groups_graph.sql` adds owner-readable, service-written `ai_group_proposals` and `ai_dependency_proposals` with an atomic indexing trigger and backfill. `src/db/types.ts` was regenerated.
- Server: `supabase/functions/_shared/{ai-runtime,ai,assistant,intelligence}.ts`; `supabase/functions/{ai-review,assistant,ai-settings}/index.ts`.
- Client/domain: `web/app/{ai,assistReview,useAssist,Shell,Dialogs,assistantApi,useEntryAssistant,demoAssistant}.ts(x)`, `web/screens/{Inbox,Mission,TaskScreen,Review}.tsx`, `web/ui/EntryAssistant.tsx`, `src/domain/{assistScreen,activity,mission,scope}.ts`. The unused List `HelpPanel` was removed. `support/pages.mjs` describes Groups.
- Tests: `supabase/tests/ai-execution.test.mjs`, shared AI tests, `web/app/{assistReview,proactiveWorkload}.test.ts`, and domain tests.

## Verification and measured mock usage

- `npm run typecheck`, `npm run test:unit` (237), `npm run test:db` (27), `npm run build`, `git diff --check`, and cached `deno check` passed locally after Groups changes. Database tests exercise real migrations in PGlite, RLS, budgets shared across owners, leases, stale saves, graph indexing, and routing. A true concurrent multi-connection load test was not run.
- The mock mixed workload imported 300 entries (100 tasks, 100 notes, 100 reminders), made 50 edits, and observed **zero** provider requests from those operations. Twenty explicit organization batches made 20 mock requests, reported 1,800 tokens, and produced 20 proposed groups and 20 proposed dependencies. Its illustrative estimate at $2 per million tokens is $0.0036; test wall time was about 1 ms.
- A separate mock interactive workload made 20 requests, reported 1,500 tokens, and returned 20 schema-valid answers. At the same illustrative rate its estimate is $0.0030; test wall time was about 10 ms. These latencies exclude a real network and provider. The quality/usefulness of the mock answers is not evidence of live AI quality.
- Browser smoke checks used the local demo at 320, 390, 430, and 1280 CSS px in light mode and 390 px in dark mode. List and the opportunity action rendered with no horizontal overflow; the mobile assistant opened, prepared a draft, and showed Copy/refinement controls. Real iPhone Safari and a signed-in cross-device session were not available for this local run.
- A further 390 px browser smoke check showed the Groups heading, permanent empty Ungrouped card, mobile Groups navigation, and no horizontal overflow. This was a local session; persisted graph reads still need signed-in production staging verification.

## Remaining limits

- The durable job schema and worker lifecycle are present, but explicit analysis is processed in the request. There is no scheduled autonomous worker in the current infrastructure; `background_enabled` stays off. Enabling it requires a deployed scheduler/worker and an operating policy.
- Organization analysis is limited to a selected batch of up to four pending to-dos. Notes and reminders are not yet group candidates. Cross-batch relationship discovery and background refresh after edits are not implemented. Opening/navigation/importing never launches delayed provider calls.
- No external account connector is configured. Exe prepares drafts and search suggestions; it cannot send, book, buy, submit, or verify live web sources. Those actions need a separate integration and explicit authorization.
- No paid provider, production migration, or production smoke test was run. Model price rows are empty until configured; default cost figures use fallback rates. Usage is an estimate, not a bill.
- The nested `exe-app` directory is the actual Git repository. `git diff --check` passed there; no commit, PR, or deployment was made.

Deployment order and flags are in `PROACTIVE-AI-ROLLOUT.md`.
