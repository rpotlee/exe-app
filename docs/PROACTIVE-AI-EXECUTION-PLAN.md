# Proactive AI Execution Engine implementation plan

## Goal and boundaries

Reduce work needed to act on entries in **List** while preserving the current Capture, Folder, Outcome, Task, Relationship, Focus, and Activity model. Opening the app, navigating, importing, and editing use zero provider tokens. AI output remains advisory until the person explicitly approves a workspace change. No new provider, paid service, or external action integration is introduced.

## Current architecture and limitations

- React/Vite renders List, the current Status/Groups screen, Folders, Focus, and Activity from `Workspace`; Supabase Auth, RLS, revisions, and the offline write queue already exist. The current Status destination is being replaced by Groups.
- `ai-review` and `assistant` Edge Functions use encrypted BYOK settings and `_shared/ai-runtime.ts` admission. Four providers share request construction and strict parsers. Existing admission serializes an owner's calls and enforces a fixed token-per-minute estimate. It has no global lane, configurable budgets, durable job lifecycle, or cost ledger.
- The browser `AssistReview` caches organization results locally. It analyzes only an explicit batch, but another device cannot restore those results. Its suggestions cannot safely become durable relationship intelligence. AI Review has a separate proposal flow; per-entry assistant sessions are server-persisted and stale-checked.
- `missionGroups` is the existing single projection for approved Outcomes and provisional AI collections. `groupCaptures` is the existing approval command. Capture-to-capture dependencies cannot fit the existing `relationships` endpoint constraint (Outcome/Task/Decision), and the new `ai_intelligence` JSONB alone is not a typed shared graph. Add proposal tables linked to `ai_intelligence`, then feed the same projection; do not add another grouping engine or write AI proposals into approved relationships.
- Existing `audit_events` and `Activity` already capture meaningful user and AI events. Current assistant actions generate/copy only; there is no external execution connector.

## Phase 1: AI infrastructure

1. Extend the existing admission gate with system and owner budgets, configurable provider limits, an interactive/background class, and usage ledger. Keep the current function names so both Edge Functions retain one admission path. Reserve pessimistically and settle actual reported usage. Limit unknown-usage calls conservatively.
2. Add a durable `ai_jobs` table and service-only claim/complete RPCs for explicit, bounded organization batches. Idempotency keys deduplicate requests across devices. Expiring leases, attempt limits, and backoff handle worker crashes and provider outages. Interactive calls take admission ahead of background jobs; background jobs never start from page navigation.
3. Reuse provider adapters and parser modules. Route organization to the user's configured model and keep interactive assistant on that model unless an explicit optional background model is configured. No hard-coded or silently chosen paid model.
4. Observe counts, estimated tokens/cost, errors, latency, and useful outcomes without recording prompts, credentials, or drafts in the usage ledger. Feature flags default disruptive background processing off.

## Phase 2: persistent intelligence

1. Persist versioned organization suggestions in an additive table keyed by owner, source capture revision, provider/model/prompt version, and kind. Mark stale results on edit. Store only validated IDs and bounded explanations.
2. Analyze explicit batches incrementally, using a small candidate neighborhood rather than the whole List. Save priority, group, and dependency proposals; never directly modify user priorities, outcomes, or relationships.
3. Keep user dismissal and corrections authoritative. A proposed dependency is never a verified blocker. Integrate current Groups rendering with fresh, undismissed persisted suggestions. Use compare-and-swap revisions and unique keys to prevent duplicate or stale writes.
4. Normalize detected group membership and capture dependencies into owner-readable, service-written proposal tables. Index them atomically when an intelligence record is saved; backfill already saved records. The Groups destination reads these same proposals through `AssistReview` and `missionGroups`. Keep the permanent Ungrouped projection even when empty. Retain legacy Status URL aliases.

## Phase 3: proactive assistance

1. Screen List entries with deterministic local rules for draft, answer, preparation, and blocker opportunities. Show concise, task-specific affordances without generating on opening or navigation.
2. Make explicit assistant requests produce a useful answer, one concrete next action, or a draft. Ask one short question only when the missing fact changes the action. Keep provider output schema-validated and bounded; show uncertainty and label unverified source suggestions.
3. Keep List mobile-first: compact rows, readable affordances, no automatic analysis banner or generic AI commentary. Preserve all existing filters, editing, reminders, folders, and completion behavior.

## Phase 4: controlled execution

1. Define server-owned action intents and authorization checks. Safe local operations (copy, opening an existing view) can run directly. Any workspace mutation needs explicit user approval and a revision-checked command; record the approved action in Activity.
2. Do not send email, book, buy, submit, or access external accounts without an available connector and explicit authorization. With none configured, expose prepared drafts for review/copy and document the integration boundary.

## Affected files and migration

- New additive Supabase migration for job, intelligence, and usage tables plus admission/job RPCs, RLS, and indexes; regenerate `src/db/types.ts` if client reads new tables.
- Extend `supabase/functions/_shared/{ai-runtime,ai,assistant}.ts`, `supabase/functions/{ai-review,assistant}/index.ts`; add a bounded worker function only if the existing Edge runtime can invoke it without new infrastructure.
- Update `web/app/{ai,assistReview,useAssist,aiRequests}.ts`, `web/ui/EntryAssistant.tsx`, `web/screens/{Inbox,Mission,Activity}.tsx`, and domain helpers only where needed. Keep the existing navigation and entity commands.
- Add focused unit, SQL/RLS, and workload tests. Update deployment runbook and help text for the new behavior.

## Verification and rollout

After each phase run narrow tests, then `npm run typecheck`, `npm run test:unit`, `npm run test:db`, `npm run build`, and `git diff --check`. Simulate 300 mixed imports, 50 changes, 20 interactive requests, concurrent owners, 429/outage, corrected groups, unauthorized actions, and stale/duplicate responses. Record calls, tokens, estimated cost, latency, and useful outcomes. Database migration and Edge deployment precede client rollout; verify a backup, deploy behind disabled flags, smoke-test signed-in flows, then enable deliberately. Production deployment and real provider spend are separate owner-reviewed actions.

## Risks and dependencies

- The repository contains a staged, unapplied admission migration; the new migration must be ordered after it. Production schema state and backup must be checked before applying either.
- BYOK provider prices and quotas vary. Cost estimates need configurable per-model rates; unknown rates must be labeled unknown and constrained by tokens.
- Supabase Edge Functions do not provide a durable scheduler by themselves. Jobs can be processed opportunistically after explicit enqueue; scheduled processing needs existing platform cron configuration or a future deployment decision.
- Per-entry assistant and browser-side organization caches are already used. Migration must preserve visible saved results and avoid treating local suggestions as authoritative.
- Work inside the nested `exe-app` Git repository; its tracked changes are reviewable with `git diff`. Production deployment remains a separate step.
