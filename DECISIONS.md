# Exe — Product Decision Log

Owner-approved product decisions. Each entry names the blueprint gap it resolves (`PRODUCT-BLUEPRINT.md` §9) and what it changes. `V1-LOCKED-SPEC.md` is not edited; entries here are the approved amendments until the owner chooses to fold them into the spec.

## DEC-001 — Folders, starting data and "All notes" (2026-11-08)
**Resolves:** P-02, P-03, P-23 (partly P-10, P-16). **Amends:** spec wording "preserve the five original Altr workstreams" [S§0, S§3 Map, S§5].

1. **Folders.** The existing Workstream entity is presented to users as a **Folder**. Users can create, rename and delete folders (e.g. Home, Work, Family Reunion). No ninth entity is added.
2. **Filing.** Captures, tasks, outcomes, decisions and ideas can all be filed into a folder.
3. **All notes.** One view shows everything across all folders plus anything not yet filed.
4. **Inbox.** New captures start unfiled. The user files them, or AI Review suggests a folder that the user approves.
5. **Sample data.** *(Amended 2026-11-08, see DEC-002.)* Regular users start with a completely empty app: no example folders or captures. The Altr folders and the 18 original captures are the owner's own test data and are not shown to regular users. No "Remove example data" action is needed for regular users.
6. **Deleting a folder.** Never silent. A folder that contains items asks whether to move them to another folder or to All notes first.

**Closed by DEC-002:** the earlier open points (example captures starting "pending", links to removed example records) no longer apply, because regular users never see example data.

## DEC-002 — AI Review rules and empty start for regular users (2026-11-08)
**Resolves:** P-08. **Amends:** DEC-001 item 5. **Source:** owner approval in chat. Rules 1–3 and 6 follow EXE_MASTER_PRODUCT_AND_BUILD_SPEC §7.2, §7.3, §7.5, §7.7; rules 4–5 are owner-approved recommendations not stated in that document.

1. **Defer** means "not now": the item leaves the review queue; the capture and the recommendation are kept and can be found again. No timer.
2. **Reject** exists: the suggestion is not applied, the capture is untouched, and the rejection is recorded so the same suggestion is not repeated.
3. **Merge duplicates:** proposed only, with both originals visible and a preview. After approval, neither original is deleted, both are traced to the result, and the merge can be undone.
4. **One capture, several items:** allowed only with the user's approval; the original capture stays whole.
5. **"Unsorted work":** never created silently. If no outcome fits, the app asks: create one, pick an existing one, or leave the task loose.
6. A suggestion may also be "just a note" (kept as a note, not a task).
7. **Regular users start empty.** The Altr folders and 18 captures are the owner's test data only.
