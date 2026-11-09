import { describe, expect, it } from 'vitest';
import { emptyWorkspace, type Capture, type Workspace } from './model';
import { ALL, executables, folderCounts, kindCounts, taskFolder, validScope } from './scope';

const base = { owner_id: 'u', created_at: '2027-01-01T00:00:00Z', updated_at: '2027-01-01T00:00:00Z', revision: 1 };
const cap = (id: string, kind: string, folder: string | null, t: string, extra: Partial<Capture> = {}): Capture => ({ ...base, id, text: id, edited_text: null, source: '', folder_id: folder, batch_id: null, batch_text: null, completed_at: null, archived_at: null, status: 'pending', organized_as: null, review_state: null, review_at: null, rejected_fingerprints: [], task_id: null, merged_into: null, kind, display_title: null, user_priority: null, remind_at: null, remind_done_at: null, created_at: t, ...extra });
const ws: Workspace = { ...emptyWorkspace(), folders: [{ ...base, id: 'f1', name: 'Work', description: '', icon: 'folder', position: 0 }, { ...base, id: 'f2', name: 'Home', description: '', icon: 'folder', position: 1 }],
  captures: [cap('a', 'todo', null, '2027-01-01T01:00:00Z'), cap('b', 'note', 'f1', '2027-01-01T02:00:00Z'), cap('c', 'reminder', 'f1', '2027-01-01T03:00:00Z'), cap('d', 'todo', 'f2', '2027-01-01T04:00:00Z'), cap('e', 'todo', 'f1', '2027-01-01T05:00:00Z', { archived_at: '2027-02-01T00:00:00Z' }), cap('legacy', '', null, '2027-01-01T00:30:00Z')],
  outcomes: [{ ...base, id: 'o', folder_id: 'f1', name: 'O', description: '', pinned: false, deadline: null, effort: null, done_at: null, last_worked_at: null, sources: [] }],
  tasks: [{ ...base, id: 't1', outcome_id: 'o', name: 'in outcome', notes: '', folder_id: 'f2', done_at: null, archived_at: null, deadline: null, effort: null, position: 0, sources: [] }, { ...base, id: 't2', outcome_id: null, name: 'loose', notes: '', folder_id: 'f2', done_at: null, archived_at: null, deadline: null, effort: null, position: 0, sources: [] }] };

describe('scope', () => {
  it('All shows every live entry exactly once; a folder shows only its own; Unfiled is the null folder', () => {
    const all = executables(ws, ALL, 'everything').map(c => c.id);
    expect(all).toEqual(['d', 'c', 'b', 'a', 'legacy']); expect(new Set(all).size).toBe(all.length);          // newest first, archived left out
    expect(executables(ws, { kind: 'folder', id: 'f1' }, 'everything').map(c => c.id)).toEqual(['c', 'b']);
    expect(executables(ws, ALL, 'everything', { archived: true }).map(c => c.id)).toEqual(['e']);
  });
  it('type filters are views only, and an entry with no kind (older data) counts as a to-do', () => {
    expect(executables(ws, ALL, 'todo').map(c => c.id)).toEqual(['d', 'a', 'legacy']);
    expect(executables(ws, ALL, 'note').map(c => c.id)).toEqual(['b']);
    expect(kindCounts(ws, { kind: 'folder', id: 'f1' })).toEqual({ everything: 2, todo: 0, note: 1, reminder: 1 });
    expect(kindCounts(ws, ALL)).toEqual({ everything: 5, todo: 3, note: 1, reminder: 1 });
  });
  it('folder counts add up to All, and a missing folder falls back to All', () => {
    const n = folderCounts(ws); expect(n.all).toBe(5); expect(n.unfiled + Object.values(n.byFolder).reduce((a, b) => a + b, 0)).toBe(n.all);
    expect(validScope(ws, { kind: 'folder', id: 'gone' })).toEqual(ALL); expect(validScope(ws, { kind: 'folder', id: 'f2' })).toEqual({ kind: 'folder', id: 'f2' });
  });
  it('a step in an outcome follows the outcome; a loose step uses its own folder', () => {
    expect(taskFolder(ws, ws.tasks[0]!)).toBe('f1'); expect(taskFolder(ws, ws.tasks[1]!)).toBe('f2');
  });
});
