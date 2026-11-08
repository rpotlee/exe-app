// A "write" is one database change. Commands (commands.ts) are pure: they read a Workspace and return writes.
// applyWrites() replays writes in memory so the screen updates at once; the store then persists the same writes.
import type { Database } from '../db/types';
import { emptyWorkspace, type Workspace } from './model';

export type Table = keyof Database['public']['Tables'];
export type Row = Record<string, unknown>;
export interface Write { table: Table; op: 'insert' | 'update' | 'delete'; row: Row }

export interface Ctx { owner: string; now(): string; id(): string }
export const realCtx = (owner: string): Ctx => ({ owner, now: () => new Date().toISOString(), id: () => crypto.randomUUID() });

export const baseRow = (ctx: Ctx) => ({ id: ctx.id(), owner_id: ctx.owner, created_at: ctx.now(), updated_at: ctx.now(), revision: 1 });
export const pk = (table: Table): string => (table === 'user_settings' ? 'owner_id' : 'id');

type WsKey = keyof Workspace;
const KEY: Partial<Record<Table, WsKey>> = {
  folders: 'folders', outcomes: 'outcomes', focus_assignments: 'focus', tasks: 'tasks', captures: 'captures', decisions: 'decisions',
  decision_options: 'decisionOptions', decision_log: 'decisionLog', ideas: 'ideas', relationships: 'relationships',
};

const clear = <T extends Row>(rows: T[], col: string, value: unknown): T[] => rows.map(r => (r[col] === value ? { ...r, [col]: null } : r));

/** Mirrors the database: foreign keys that "set null" or "cascade" on delete. */
function cascade(ws: Workspace, table: Table, id: string): Workspace {
  let next = ws;
  if (table === 'folders') next = { ...next, outcomes: clear(next.outcomes, 'folder_id', id), captures: clear(next.captures, 'folder_id', id), decisions: clear(next.decisions, 'folder_id', id), ideas: clear(next.ideas, 'folder_id', id) } as Workspace;
  if (table === 'outcomes') {
    next = { ...next, tasks: clear(next.tasks, 'outcome_id', id), focus: next.focus.filter(f => f.outcome_id !== id) };
    if (next.settings?.current_focus_outcome_id === id) next = { ...next, settings: { ...next.settings, current_focus_outcome_id: null } };
  }
  if (table === 'tasks') next = { ...next, captures: clear(next.captures, 'task_id', id) } as Workspace;
  if (table === 'decisions') next = { ...next, decisionOptions: next.decisionOptions.filter(o => o.decision_id !== id), decisionLog: next.decisionLog.filter(l => l.decision_id !== id) };
  return next;
}

/** Mirrors the database: an outcome leaving Now (or losing its assignment) can no longer be the current focus. Not a user edit, so no revision bump. */
function clearFocusIfLeftNow(ws: Workspace, w: Write, id: string): Workspace {
  const focusId = ws.settings?.current_focus_outcome_id;
  if (!focusId || !ws.settings) return ws;
  const a = ws.focus.find(f => f.id === id);
  const leaves = w.op === 'delete' ? a?.outcome_id === focusId : w.op === 'update' && a?.outcome_id === focusId && w.row.lane !== undefined && w.row.lane !== 'now';
  return leaves ? { ...ws, settings: { ...ws.settings, current_focus_outcome_id: null } } : ws;
}

export function applyWrites(ws: Workspace, writes: Write[]): Workspace {
  let next = ws;
  for (const w of writes) {
    if (w.table === 'user_settings') {
      if (w.op === 'insert') next = { ...next, settings: w.row as unknown as Workspace['settings'] };
      else if (w.op === 'update' && next.settings) next = { ...next, settings: { ...next.settings, ...w.row, revision: next.settings.revision + 1 } as Workspace['settings'] };
      continue;
    }
    const key = KEY[w.table];
    if (!key) continue;                                   // audit events, proposals etc. are not kept in the in-memory workspace
    const id = w.row.id as string;
    if (w.table === 'focus_assignments') next = clearFocusIfLeftNow(next, w, id);
    const rows = next[key] as unknown as (Row & { id: string; revision: number })[];
    if (w.op === 'insert') next = { ...next, [key]: [...rows, w.row] };
    else if (w.op === 'update') next = { ...next, [key]: rows.map(r => (r.id === id ? { ...r, ...w.row, revision: r.revision + 1 } : r)) };
    else next = cascade({ ...next, [key]: rows.filter(r => r.id !== id) }, w.table, id);
  }
  return next;
}
export { emptyWorkspace };
