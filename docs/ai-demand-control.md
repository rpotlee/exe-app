# AI demand control

Status: implemented on `codex/ai-demand-control`, pending deployment. Migration 14 is staged only. No production database changes or real provider calls were made during this work.

## Root cause

The old globally mounted `useAssist` scheduled analysis 2.5 seconds after loading the workspace. It processed eight unfinished captures at a time and scheduled the next batch after saving either success or failure. A fresh set of 300 eligible captures therefore created up to 38 provider calls without an explicit request. A provider rate limit did not stop the sweep. Opening a task could independently generate its draft again through `assistant/open`.

Groq/OpenAI request construction also omitted the output-token cap requested by the caller, and provider 429 responses were translated into HTTP 502 without retry timing.

## Behavior after this change

| User action | Provider work |
| --- | --- |
| Open or refresh Exe; navigate; import 300 entries | None |
| Create, edit, complete, file, or archive entries | None |
| Open task details | Restore saved server state; no generation |
| Open an unchanged prepared task on another device | Restore the same saved result; no generation |
| Press Prepare help or submit a question | At most one provider request; unchanged preparation reuses its saved result |
| Copy a draft | Local clipboard operation |
| Review next entries | One organization-only batch of up to four, then stop |
| Reach a provider limit | Pause; show countdown; keep work; require an explicit retry |

The ordinary local sorting, search, reminder and completion logic does not need a model. Full drafts, answers and source suggestions are reserved for the particular entry the user requests. Batch analysis only proposes priorities, groups and dependencies; it never applies them or prepares every entry's draft.

## Controls

- A shared browser coordinator serializes generation, coalesces identical in-flight operations, and allows at most one active plus four queued requests. Restore-only reads remain available during cooldown. No automatic retries.
- Assistant operation IDs survive failed responses until success, allowing an already saved result to be replayed instead of generated again. Exactly-once provider billing is not promised: a provider result lost before database persistence can still cost another call on retry.
- Prepared server state is identified by entry text/kind, chosen provider/model, and prompt version. Metadata-only task edits do not invalidate it. Empty/no-help results are cached too. Old artifact versions remain available in session history.
- Device caches are owner/content scoped; organization caches also distinguish provider/model/prompt version. Legacy unscoped caches are ignored. Failed analysis is never marked complete.
- Both Edge Functions use a service-only database lease before contacting a provider. The lease covers generation, validation and session persistence, with expiry and fenced release. It coordinates tabs/devices and separate Edge instances for the same Exe owner.
- Conservative default admission: 3-second spacing and an estimated 6,000-token/minute account budget. Input estimates use UTF-8 bytes; actual reported usage settles reservations. Provider remaining-token/reset headers can further restrict admission. This is an application safety preset, not a statement of the user's purchased quota.
- Output caps are actually sent: organization batch 1,100; classification 1,500; task assistant 1,800; suggested steps 600; connection test 64. Prompts have bounded context and byte limits. Saved artifacts/history are not shortened when prompt context is trimmed.
- Sanitized HTTP 429 responses preserve `Retry-After` timing. Raw provider errors and keys are never returned or logged.
- Failed database admission fails closed: no provider request is sent.

Groq applies quotas at organization level and exposes retry/budget headers: [official rate-limit documentation](https://console.groq.com/docs/rate-limits). Other Exe owners or other applications using that organization can still consume the same allowance. No app can guarantee the provider will never return 429; the goal is to prevent unnecessary work and recover without a retry storm.

## Verification and rollout

Regression coverage includes a 300-entry startup with zero generation, one batch per click, no continuation after success or failure, double-click coalescing, settings/content cache invalidation, stable retry IDs, cooldown shared across endpoints, old-backend restore rejection, output caps, prompt bounds, and database lease/budget/RLS/fencing behavior.

The local browser screenshot uses the existing fake AI development mode; it did not call a real provider: [explicit review control](../artifacts/ai-demand-review/explicit-review-390.png).

Deployment order:

1. Verify a current backup and recovery procedure for Supabase project `ifwzslpfxgwfgtyduyuo`. Do not apply database changes without it.
2. Use the Supabase CLI to verify migration history and apply migration `20261109000014_ai_admission.sql` in sequence.
3. Deploy `assistant` and `ai-review` together. `ai-settings` needs no code change.
4. Merge/publish the frontend through main/Netlify. The new client uses `restore`; an old server rejects it before generating, so a mixed-version preview fails safely instead of silently spending tokens.
5. Verify no provider calls on startup/navigation/import, cached task restoration, explicit generation, duplicate clicks, cooldown and subsequent explicit retry. Only run a real connection/generation test if a valid key is already securely configured.

No new secrets are required. Migration 14 contains operational counters and lease IDs only, not credentials, prompts or drafts.
