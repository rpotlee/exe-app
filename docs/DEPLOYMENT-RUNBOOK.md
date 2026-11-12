# Exe production deployment runbook

> Historical release notes. For the current Proactive AI rollout, use [PROACTIVE-AI-ROLLOUT.md](PROACTIVE-AI-ROLLOUT.md) and `CURRENT_STATE.md`; hosting and migration state below may be outdated.

Project ref: `ifwzslpfxgwfgtyduyuo`. Site: Netlify (auto-deploys from `main`). **Nothing below has been done yet.** Each step marked 🔑 needs the owner's explicit go-ahead; Claude stops before them.

## What is being released
The stacked PRs #12–#19 plus the `release/assistant-service` work: revamped List, Status/All tasks/Groups, Activity Log, priority labels, per-task AI assistant with saved conversations, reminders, new help center. Live today is the old pre-revamp build.

## Order (do not reorder)
1. **Back up first.** In the live app: Settings → Download JSON backup. Keep the file. Also in the Supabase dashboard note the current time (the free plan has no automatic backups).
2. 🔑 **Apply migrations 9–12 to the live database** (all additive; each file begins with its undo statement).
   - 9 `capture_kind`: kind, display_title, user_priority on captures. Existing captures become Tasks.
   - 10 `task_folder`: tasks.folder_id.
   - 11 `assistant_sessions`: new table, read-only to clients (only the function writes).
   - 12 `reminders`: remind_at, remind_done_at on captures.
   ```bash
   supabase db push --linked
   ```
   Check afterward: sign in to the OLD site and confirm it still loads (additive columns do not break it).
3. 🔑 **Deploy the edge functions** (the live `ai-review` predates priorities/groups; `assistant` is new). `EXE_KEY_SECRET` is already set.
   ```bash
   supabase functions deploy ai-review --use-api
   supabase functions deploy assistant --use-api
   ```
   Signed-out calls to each should answer 401 "Sign in first."
4. 🔑 **Merge to `main`** (Netlify then builds and publishes automatically). Merge the single release PR, or the stack bottom-to-top (#12 … #19, then the release branch). Netlify needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set (already configured). Never put the service-role key in Netlify.
5. **Verify** on the live site (see below).

## Rollback
- Site: Netlify → Deploys → publish the previous deploy.
- Database: migrations are additive; the old site keeps working with the new columns. Undo statements are at the top of each file if ever needed.
- Functions: redeploy the previous commit's function folder.

## Verification checklist (owner, on the live site)
Claude cannot do these: they need your login, a real key, or real devices.
- [ ] Sign in; your existing entries appear as Tasks in the List; check/uncheck works and persists after refresh.
- [ ] Add a Note and a Reminder; reminder with a time in the past shows the banner; Snooze and Dismiss work.
- [ ] Status shows All tasks and Groups; View all tasks opens the full screen.
- [ ] Settings → AI: key saved, Test connection succeeds (first live provider call ever).
- [ ] On All tasks, open a task's sparkle: the assistant answers, a refinement makes a second version, Copy works, **nothing is sent anywhere**.
- [ ] Activity Log shows those AI actions.
- [ ] iPhone Safari: keyboard doesn't cover the composer; dock labels readable; add to Home Screen.
- [ ] Second device: sign in, refresh, see the same data; edit on both and confirm the conflict screen (no silent overwrite).
- [ ] Help center (`/support/index.html`) matches the screens.

## Known limits (be honest with users)
- Reminders appear inside the app only while it is open. No push, email, text or calendar file (the .ics export is on hold, DEC-019).
- The assistant only drafts and advises. It does not send, book, call or search live.
- Updates from another device appear after refresh (no live sync).
- Real AI quality has not been exercised yet; the first live runs are in the checklist above.
