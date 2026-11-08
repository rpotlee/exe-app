# Exe — Product Decision Log

Owner-approved product decisions. Each entry names the blueprint gap it resolves (`PRODUCT-BLUEPRINT.md` §9) and what it changes. `V1-LOCKED-SPEC.md` is not edited; entries here are the approved amendments until the owner chooses to fold them into the spec.

## DEC-001 — Folders, starting data and "All notes" (2026-11-08)
**Resolves:** P-02, P-03, P-23 (partly P-10, P-16). **Amends:** spec wording "preserve the five original Altr workstreams" [S§0, S§3 Map, S§5].

1. **Folders.** The existing Workstream entity is presented to users as a **Folder**. Users can create, rename and delete folders (e.g. Home, Work, Family Reunion). No ninth entity is added.
2. **Filing.** Captures, tasks, outcomes, decisions and ideas can all be filed into a folder.
3. **All notes.** One view shows everything across all folders plus anything not yet filed.
4. **Inbox.** New captures start unfiled. The user files them, or AI Review suggests a folder that the user approves.
5. **Sample data.** A new account starts with example folders (the Altr set). Settings has a single "Remove example data" action that removes only example records, never user-created ones. Example records need a marker (technical detail).
6. **Deleting a folder.** Never silent. A folder that contains items asks whether to move them to another folder or to All notes first.

**Still open from this topic:** whether some of the 18 example captures start as "pending" so AI Review can be demonstrated (recommended: yes, a few); behavior of items that link to a removed example record (recommended: keep the item, show the link as removed).
