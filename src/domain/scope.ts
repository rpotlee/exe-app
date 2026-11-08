// Folder scope (revamp spec §3). "All" is a view over everything, never a stored folder; a folder is a user-created workspace.
// Every record has at most one folder (null = Unfiled), so All shows each record exactly once. A step inside an outcome follows its outcome.
import type { Capture, Decision, Idea, Outcome, Task, Workspace } from './model';

export type Scope = { kind: 'all' } | { kind: 'folder'; id: string };
export const ALL: Scope = { kind: 'all' };
export type CaptureKind = 'todo' | 'note' | 'reminder';
export const KINDS: CaptureKind[] = ['todo', 'note', 'reminder'];
export type KindFilter = 'everything' | CaptureKind;

const has = (s: Scope, folderId: string | null): boolean => s.kind === 'all' || folderId === s.id;
/** A saved scope can point at a folder that was deleted; fall back to All instead of showing nothing. */
export const validScope = (ws: Workspace, s: Scope): Scope => (s.kind === 'folder' && !ws.folders.some(f => f.id === s.id) ? ALL : s);
export const captureIn = (s: Scope, c: Capture): boolean => has(s, c.folder_id);
export const outcomeIn = (s: Scope, o: Outcome): boolean => has(s, o.folder_id);
export const decisionIn = (s: Scope, d: Decision): boolean => has(s, d.folder_id);
export const ideaIn = (s: Scope, i: Idea): boolean => has(s, i.folder_id);
/** A step's effective folder: its outcome's, or its own when it is a loose step. */
export const taskFolder = (ws: Workspace, t: Task): string | null => (t.outcome_id ? (ws.outcomes.find(o => o.id === t.outcome_id)?.folder_id ?? null) : t.folder_id);
export const taskIn = (ws: Workspace, s: Scope, t: Task): boolean => has(s, taskFolder(ws, t));

export const kindOf = (c: Capture): CaptureKind => (KINDS.includes(c.kind as CaptureKind) ? (c.kind as CaptureKind) : 'todo');

/** The Executables list for a scope and type filter: newest first, with a stable tie-break on id. Archived entries are separate. */
export function executables(ws: Workspace, s: Scope, filter: KindFilter, opts: { archived?: boolean } = {}): Capture[] {
  // entries saved together share a timestamp, so ties keep the order they were saved in (the later one is newer)
  return ws.captures.map((c, i) => ({ c, i }))
    .filter(({ c }) => !!c.archived_at === !!opts.archived && captureIn(s, c) && (filter === 'everything' || kindOf(c) === filter))
    .sort((a, b) => b.c.created_at.localeCompare(a.c.created_at) || b.i - a.i).map(x => x.c);
}
export function kindCounts(ws: Workspace, s: Scope): Record<KindFilter, number> {
  const live = ws.captures.filter(c => !c.archived_at && captureIn(s, c));
  return { everything: live.length, todo: live.filter(c => kindOf(c) === 'todo').length, note: live.filter(c => kindOf(c) === 'note').length, reminder: live.filter(c => kindOf(c) === 'reminder').length };
}
/** Counts per folder plus Unfiled and All, for the drawer. Each record is counted once. */
export function folderCounts(ws: Workspace): { all: number; unfiled: number; byFolder: Record<string, number> } {
  const live = ws.captures.filter(c => !c.archived_at), byFolder: Record<string, number> = {};
  for (const c of live) if (c.folder_id) byFolder[c.folder_id] = (byFolder[c.folder_id] ?? 0) + 1;
  return { all: live.length, unfiled: live.filter(c => !c.folder_id).length, byFolder };
}
