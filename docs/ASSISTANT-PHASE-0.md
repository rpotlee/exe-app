# Intelligent Assistant: Phase 0 report (audit and reconciliation)

Spec: `EXE-INTELLIGENT-ASSISTANT-UX-CLAUDE-HANDOFF-v1.0.md` (owner, 2026-11-08). Written against branch `revamp/wording` (PR #17), the top of a stack of six unmerged PRs (#12 to #17) on top of `main` (caebaf4). Nothing here is live: the deployed site and database are still the pre-revamp version.

## 1. What exists today (verified in the code)

| Area | Fact |
|---|---|
| AI help | `web/app/useAssist.ts` batches up to 8 changed captures after ~2.5 s, calls `ai-review` (`mode: assist`), keeps results in browser storage `exe-assist-v1` (device-local, hash-keyed). Output: per-task email / research / answer + priorities + groups + dependencies. Not a conversation. |
| Where AI help shows | Only on the task screens (`web/screens/TaskScreen.tsx`, via `Help` in `web/ui/AssistParts.tsx`): a dropdown with a "Next:" line, full draft, sources, Copy / Open in email. The List shows none (DEC-017). |
| Server | `supabase/functions/ai-review` + `_shared/ai.ts`: BYOK, encrypted key, strict output parsing, one `assist` request/response. No per-entry thread, no follow-up, no artifact versions. Deployed version is older than the code (priorities not live). |
| Persistence | No threads, turns or artifacts exist in the database. `audit_events` exists (append-only) and carries the Activity Log. |
| Navigation (current names) | List · Status · (+) · Activity · Folders. The spec's older names (Executables, Mission Status, AI Assistant) are now List, Status, Activity Log. |

## 2. Conflicts between the spec and newer owner decisions

1. **AI on the List.** Spec §4.1 shows a one-line status under List rows ("Text ready"); DEC-017 says the List shows no AI help. **Resolution for Phase 1:** the List stays free of AI decoration. The compact one-line status and the tap-to-open assistant live on the task screens ("View all tasks" and each group), where AI help already lives. Question 1 below.
2. **AI Assistant page.** Spec says a global "AI Assistant → Assistance + Activity"; the owner replaced it with a plain Activity Log (DEC-018). Kept as the Log; the Log will record assistant events (Phase 4).
3. **"Next:" lines and the Help dropdown** are removed from the task screens in this build, as the spec requires.
4. Mission-level content (spec §13) is unchanged.

## 3. What can and cannot be built without your approval

- **Phase 1 (this PR): the shell.** Compact status row, assistant detail (full-height sheet on phones, right-hand inspector on desktop), sticky composer, adaptive actions (max 3, 44px targets, "More" on narrow screens), keyboard/safe-area handling. It runs on a **clearly labeled demo assistant** (device-only, keyword rules; shown with a "Demo" tag). Real signed-in accounts see the existing real results as artifacts and an honest note that follow-ups are not connected yet.
- **Phase 2: persistence.** Needs a new migration (threads, turns, artifacts) on your live database: **not applied without your approval and your data export.**
- **Phase 3: the real assistant service.** New function modes (turn, action) on `ai-review`. Code and mocked-provider tests I can write; deploying it needs your go-ahead; and I **cannot** test it against your real key (it only works under your login), so you would have to try it.
- **Retrieval / verified sources:** no live retrieval exists. Sources stay labeled "Suggested source / Search this site", never "verified".

## 4. Questions for you

1. Should tapping a **List** row also open the assistant (with the List itself still showing no AI status), or only the task screens?
2. OK to build Phase 1 on the demo assistant first and stop for your review before any migration or deployment?
3. The iPhone keyboard proof the spec requires is yours to run; I can only test emulation.
