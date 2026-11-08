import { describe, expect, it } from 'vitest';
import { emptyWorkspace, type Capture, type Workspace } from './model';
import { ALL } from './scope';
import { countsOf, missionGroups, type AiHints } from './mission';

const base = { owner_id: 'u', updated_at: 't', revision: 1 };
const cap = (id: string, extra: Partial<Capture> = {}): Capture => ({ ...base, id, text: id, edited_text: null, source: '', folder_id: null, batch_id: null, batch_text: null, completed_at: null, archived_at: null, status: 'pending', organized_as: null, review_state: null, review_at: null, rejected_fingerprints: [], task_id: null, merged_into: null, kind: 'todo', display_title: null, user_priority: null, created_at: '2027-01-01T00:00:00Z', ...extra });
const step = (id: string, pos: number, sources: string[], done = false) => ({ ...base, id, created_at: 't', outcome_id: 'o1', name: id, notes: '', folder_id: null, done_at: done ? 'x' : null, archived_at: null, deadline: null, effort: null, position: pos, sources });
const ws: Workspace = { ...emptyWorkspace(),
  outcomes: [{ ...base, id: 'o1', created_at: 't', folder_id: null, name: 'Move', description: '', pinned: false, deadline: null, effort: null, done_at: null, last_worked_at: null, sources: [] }],
  focus: [{ ...base, id: 'f', created_at: 't', outcome_id: 'o1', lane: 'now', position: 0 }],
  tasks: [step('t1', 0, ['cm']), step('t2', 1, []), step('t3', 2, ['cx'], true)],
  captures: [cap('cm', { status: 'organized', task_id: 't1', user_priority: 'low' }), cap('cx', { status: 'organized', user_priority: 'high' }), cap('a'), cap('b'), cap('c', { user_priority: 'high' }), cap('d', { completed_at: 'x' }), cap('note', { kind: 'note' })] };
const hints: AiHints = { priorities: { a: { level: 'medium', why: 'Due soon' }, b: { level: 'high', why: 'Money' }, cm: { level: 'high', why: 'ignored: you set low' } }, groups: [{ name: 'Hiring', ids: ['a', 'b'] }, { name: 'Bad', ids: ['a', 'c'] }, { name: 'One', ids: ['d'] }] };

describe('missionGroups', () => {
  it('your outcomes first, then AI-suggested groups, then one group for everything not grouped; notes and already-organized to-dos are not loose tasks', () => {
    const g = missionGroups(ws, ALL, hints, 'ai');
    expect(g.map(x => [x.kind, x.name])).toEqual([['outcome', 'Move'], ['suggested', 'Hiring'], ['rest', 'Not grouped yet']]);
    expect(g[2]!.tasks.map(t => t.id)).toEqual(['c', 'd']);          // a and b belong to Hiring; the overlapping and one-item AI groups are ignored; done sorts last
  });
  it('your label wins over the AI; an AI label is marked as the AI\'s; tasks sort by label', () => {
    const g = missionGroups(ws, ALL, hints, 'ai');
    expect(g[0]!.tasks[0]).toMatchObject({ id: 't1', level: 'low', fromAi: false });
    expect(g[1]!.tasks.map(t => [t.id, t.level, t.fromAi])).toEqual([['b', 'high', true], ['a', 'medium', true]]);
  });
  it('counts open tasks and how many of each priority (finished tasks are not counted)', () => {
    const g = missionGroups(ws, ALL, hints, 'ai');
    expect(countsOf(g[0]!.tasks)).toEqual({ total: 2, high: 0, medium: 0, low: 1, none: 1 });          // t3 is done
    expect(countsOf(g[1]!.tasks)).toEqual({ total: 2, high: 1, medium: 1, low: 0, none: 0 });
    expect(countsOf(g[2]!.tasks)).toEqual({ total: 1, high: 1, medium: 0, low: 0, none: 0 });          // d is done
  });
  it('"mine" shows only your labels, and "off" shows none', () => {
    expect(missionGroups(ws, ALL, hints, 'mine')[1]!.tasks.map(t => t.level)).toEqual([null, null]);
    expect(missionGroups(ws, ALL, hints, 'off').flatMap(g => g.tasks).every(t => t.level === null)).toBe(true);
  });
});
