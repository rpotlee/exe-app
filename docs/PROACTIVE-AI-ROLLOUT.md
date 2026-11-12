# Proactive AI execution rollout

Status: implemented locally, not applied to the production database or deployed. The active production brief is `CURRENT_STATE.md` (Cloudflare Workers for the web app and Supabase for data/functions). `docs/DEPLOYMENT-RUNBOOK.md` is historical and mentions an older hosting arrangement.

## Deployment order

1. Confirm the deployed commit and Supabase migration history; take and verify a current JSON/database backup. Review the patch in the nested `exe-app` Git repository before merging.
2. Apply the existing staged `20261109000014_ai_admission.sql` if it is not already present, followed by `20261110000015_ai_execution.sql` and `20261110000016_ai_groups_graph.sql`. Migration 15 adds jobs, intelligence, usage, limits, routing, and stale checks. Migration 16 atomically indexes group membership and capture dependencies from the same analysis records. Do not skip migrations 14 or 15.
3. Deploy `ai-settings`, `ai-review`, and `assistant` together. No new secret or paid service is required; the existing `EXE_KEY_SECRET`, Supabase service role on the functions, and each user's BYOK setting remain required. The browser must never receive the service role or provider key.
4. Publish the web build only after the functions are ready. Verify List, Groups (including the old Status URL alias), Folders, Focus, Activity, and AI settings on the production URL. A signed-in test account should verify that opening/navigating/importing calls no provider; explicit analysis saves and restores its group and dependency rows across devices; edits invalidate suggestions; 429/outage preserves work; group and dependency proposals need approval; manually corrected groups stay intact.
5. Keep `ai_limits.background_enabled=false` until an actual scheduled worker and operating policy exist. Explicit analysis jobs run under durable leases in the request; failed jobs back off and can be retried explicitly. Do not enable background processing just by flipping the flag.

The web build flag `VITE_PROACTIVE_AI_OPPORTUNITIES=false` hides the new List opportunity chip if the rollout needs to be reversed. The existing per-entry assistant remains reachable from row actions.

## Limits and rates

`ai_limits` has owner/system daily token and estimated cost ceilings, owner/global per-minute token limits, a global request limit, and the background flag. `ai_provider_limits` has provider-wide tokens/minute, requests/minute, and spacing. Defaults are conservative application limits; adjust them to match purchased provider quotas. `ai_model_rates` is empty by default; set official rates for each chosen model to improve estimates. Unknown models use the configured conservative fallback rate and `ai_usage.rate_source='fallback'`. No specific model or price is silently selected by Exe.

AI usage stores request class, provider/model, reserved/used tokens, estimated cost, latency, and a sanitized status. It stores no prompt, key, or generated draft. Users can see their own daily estimate in Settings. An estimated cost is not a provider invoice.

## Feature boundary

List offers local, deterministic opportunities. Organization analysis is explicit and batched. Saved priority, group, and dependency proposals are advisory; only user commands create outcomes or unconfirmed relationships. The per-entry assistant can prepare/copy drafts and answer questions. It cannot send messages, book, buy, submit, browse the live web, or mutate workspace entities through an AI action. Those capabilities need an available external connector, explicit authorization, and a separate server-side approval path.

## Verification commands

```bash
npm run typecheck
npm run test:unit
npm run test:db
deno check --cached-only supabase/functions/ai-review/index.ts supabase/functions/assistant/index.ts supabase/functions/ai-settings/index.ts
npm run build
git diff --check
```

The mock workload test uses 300 mixed entries, 50 edits, and 20 explicit requests. It reports request count, token usage, a sample cost estimate, latency, and proposed groups/dependencies. It does not exercise a paid provider or prove real response quality.
