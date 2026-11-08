# Exe database (Supabase / Postgres)

`migrations/20261108000001_exe_schema.sql` is the schema (DEC-005). It holds the eight entities, the supporting tables
(AI proposals, audit history, idempotency keys, per-user AI settings) and the rules that must hold even if a screen or a
model misbehaves. Every row has an owner, timestamps and a revision number.

## Rules the database enforces
- At most **three** Now outcomes per user (serialized with an advisory lock). One optional **current focus**, which must be a Now outcome.
- No self-blocks and no **dependency cycles**. Only **confirmed** `blocks` relationships block anything (`v_blocked_items`).
- **AI can never delete or complete anything.** The `exe_ai` role can read the owner's rows and insert pending proposals. Nothing else.
- The original capture `text` never changes (edits go to `edited_text`). The audit history is append-only.
- Users see only their own rows (row-level security); every foreign key is owner-scoped.
- The AI **key** is write-only from a server function: the browser role cannot read `key_ciphertext` or change the provider.

## Check it
```sh
npm install
npm run test:db      # runs the migration in an in-process Postgres and tries to break every rule
npm run gen:types    # regenerates src/db/types.ts from the migrations (a test fails if it drifts)
```

## Put it on a real Supabase project (needs the owner)
Nothing here creates an account or holds a secret. The owner (or whoever holds the Supabase account) must:
1. Create a Supabase project and note its URL and anon key. Check the current free-tier limits first.
2. Run `supabase link` then `supabase db push` from this folder, or paste the migration into the SQL editor.
3. Give the app `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` through an untracked `.env` file (see `.env.example`).
4. For AI later: server functions use the **service role** key (server only, never in the browser) to store the encrypted user key.

## Free-tier facts (checked 2026-11-08, see DEC-009; recheck before signing up)
500 MB database, 1 GB storage, 50,000 monthly active users, 2 active projects, **no automatic backups**, and **free projects are paused after 1 week of inactivity** (Resume button in the dashboard). Pro is from $25 a month. Use the app's JSON export as your backup on the free plan.

## Status (2026-11-08)
Installed on the owner's project "exe" and verified: `node scripts/check-supabase.mjs` (all 15 tables closed to signed-out visitors) and `supabase db query --linked -f scripts/smoke-remote.sql` (rules hold on the real database; rolled back). After any new migration: `supabase db push`, then both checks. See DEC-010.

