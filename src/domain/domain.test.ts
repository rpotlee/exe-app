import { describe, expect, it } from 'vitest';
import { blockedCount, isTaskBlocked, relationshipError, reachesByBlocks } from './blocking';
import { segmentCapture } from './capture';
import { applySuggestion, compareFacts, computeSuggestion, rankOutcomes } from './engine';
import { emptyWorkspace, type Outcome, type Relationship, type Task, type Workspace } from './model';
import { progressOf } from './progress';
import { statusParts, statusText } from './status';

const base = { created_at: '', updated_at: '', revision: 1, owner_id: 'u' };
const outcome = (id: string, extra: Partial<Outcome> = {}): Outcome => ({ ...base, id, folder_id: null, name: id, description: '', pinned: false, deadline: null, effort: null, done_at: null, last_worked_at: null, sources: [], ...extra });
const task = (id: string, outcome_id: string | null, extra: Partial<Task> = {}): Task => ({ ...base, id, outcome_id, name: id, notes: '', folder_id: null, done_at: null, archived_at: null, deadline: null, effort: null, position: 0, sources: [], group_manual: false, ...extra });
const rel = (id: string, from: string, to: string, kind: Relationship['kind'] = 'blocks', confirmed = true): Relationship =>
  ({ ...base, id, from_type: 'task', from_id: from, to_type: 'task', to_id: to, kind, description: '', confirmed, source: 'user' });
const ws = (over: Partial<Workspace> & { currentFocusOutcomeId?: string } = {}): Workspace => {
  const { currentFocusOutcomeId, ...rest } = over;
  return { ...emptyWorkspace(), ...rest, settings: currentFocusOutcomeId ? ({ ...base, current_focus_outcome_id: currentFocusOutcomeId, workspace_name: '', priority_dismissed: [], research_opt_in: false } as Workspace['settings']) : null };
};
const lanes = (now: string[], next: string[] = []) => [...now.map(o => ({ ...base, id: 'f-' + o, outcome_id: o, lane: 'now', position: 0 })), ...next.map(o => ({ ...base, id: 'f-' + o, outcome_id: o, lane: 'next', position: 0 }))];

describe('progress', () => {
  it('shows Not measured, never 0%, when there are no steps', () => {
    const w = ws({ outcomes: [outcome('o')] });
    expect(progressOf(w, 'o')).toMatchObject({ percent: null, label: 'Not measured' });
  });
  it('counts only real, unarchived steps', () => {
    const w = ws({ outcomes: [outcome('o')], tasks: [task('a', 'o', { done_at: 'x' }), task('b', 'o'), task('c', 'o', { archived_at: 'x' })] });
    expect(progressOf(w, 'o')).toMatchObject({ total: 2, done: 1, percent: 50, label: '1 of 2 steps done' });
  });
});

describe('blocking: only confirmed blocks count', () => {
  const w = ws({ tasks: [task('first', null), task('second', null)], relationships: [rel('r', 'first', 'second', 'blocks', false)] });
  it('a suggestion blocks nothing', () => { expect(isTaskBlocked(w, 'second')).toBe(false); expect(blockedCount(w)).toBe(0); });
  it('a confirmed block blocks until the blocker is done', () => {
    const c = { ...w, relationships: [rel('r', 'first', 'second')] };
    expect(isTaskBlocked(c, 'second')).toBe(true);
    expect(isTaskBlocked({ ...c, tasks: [task('first', null, { done_at: 'x' }), task('second', null)] }, 'second')).toBe(false);
  });
  it('informs and related never block', () => { expect(blockedCount({ ...w, relationships: [rel('r', 'first', 'second', 'informs')] })).toBe(0); });
});

describe('relationship validation', () => {
  const w = ws({ outcomes: [outcome('o')], tasks: [task('a', 'o'), task('b', 'o'), task('c', null)], relationships: [rel('1', 'a', 'b'), rel('2', 'b', 'c')] });
  it('rejects self-blocks, unknown items, duplicates and own-outcome links', () => {
    expect(relationshipError(w, { from: 'a', to: 'a', kind: 'blocks' })).toMatch(/itself/);
    expect(relationshipError(w, { from: 'a', to: 'zzz', kind: 'blocks' })).toMatch(/exist/);
    expect(relationshipError(w, { from: 'a', to: 'b', kind: 'blocks' })).toMatch(/already exists/);
    expect(relationshipError(w, { from: 'a', to: 'o', kind: 'blocks' })).toMatch(/already linked/);
  });
  it('rejects a dependency loop but allows non-blocking circles', () => {
    expect(relationshipError(w, { from: 'c', to: 'a', kind: 'blocks' })).toMatch(/loop/);
    expect(relationshipError(w, { from: 'c', to: 'a', kind: 'informs' })).toBeNull();
    expect(reachesByBlocks(w.relationships, 'a', 'c')).toBe(true);
    expect(reachesByBlocks(w.relationships, 'c', 'a')).toBe(false);
  });
});

describe('segmentCapture', () => {
  it('splits a short-line list, keeping order and dropping markers', () => {
    expect(segmentCapture('Call the plumber\nBook flights\n\nRenew passport')).toEqual(['Call the plumber', 'Book flights', 'Renew passport']);
    expect(segmentCapture('- one long item ' + 'x'.repeat(120) + '\n- two')).toEqual(['one long item ' + 'x'.repeat(120), 'two']);
  });
  it('keeps a paragraph or multi-line note as one capture', () => {
    const p = 'I keep wondering ' + 'word '.repeat(30) + '\nand the second line also runs ' + 'long '.repeat(30);
    expect(segmentCapture(p)).toEqual([p.trim()]);
  });
  it('handles empty and single lines', () => { expect(segmentCapture('  \n ')).toEqual([]); expect(segmentCapture(' hi ')).toEqual(['hi']); });
});

describe('Priority Engine', () => {
  const three = ['a', 'b', 'c'], all = [...three, 'd', 'e'];
  const board = (over: Partial<Outcome>[] = []) => ws({
    outcomes: all.map((id, i) => outcome(id, over[i] ?? {})), tasks: all.map(id => task('t-' + id, id)), focus: lanes(three, ['d', 'e']) as Workspace['focus'],
  });
  it('suggests nothing when no rule separates the outcomes (ties keep Now in place)', () => { expect(computeSuggestion(board())).toBeNull(); });
  it('a pinned outcome replaces the last Now outcome and says why', () => {
    const s = computeSuggestion(board([{}, {}, {}, { pinned: true }]));
    expect(s?.changes).toEqual([{ add: 'd', remove: 'c', why: 'You pinned it.' }]);
  });
  it('a confirmed blocker demotes; an unconfirmed one does not', () => {
    const blocker = (confirmed: boolean) => ({ ...board(), relationships: [{ ...rel('r', 't-d', 'c', 'blocks', confirmed), to_type: 'outcome' as const }] });
    expect(computeSuggestion(blocker(false))).toBeNull();
    expect(computeSuggestion(blocker(true))?.changes[0]).toMatchObject({ add: 'd', remove: 'c' });
  });
  it('an earlier user-entered deadline wins; no deadline is never invented', () => {
    const s = computeSuggestion(board([{}, {}, {}, { deadline: '2027-01-15' }]), d => d);
    expect(s?.changes[0]?.why).toBe('It has a deadline you entered (2027-01-15); the other has none.');
    const c = compareFacts({ id: 'x', pinned: false, blocked: false, deadline: '2027-01-01', unlocks: 0, ready: true, worked: '' }, { id: 'y', pinned: false, blocked: false, deadline: '2027-02-01', unlocks: 0, ready: true, worked: '' });
    expect(c).toEqual({ win: 1, rule: 'deadline' });
  });
  it('unlocking more confirmed work ranks higher', () => {
    const w = { ...board(), relationships: [rel('r1', 't-d', 't-a'), rel('r2', 't-d', 't-b')] };
    expect(rankOutcomes(w)[0]?.id).toBe('d');
  });
  it('is deterministic: the same facts give the same fingerprint (so Ignore can be remembered)', () => {
    const a = computeSuggestion(board([{}, {}, {}, { pinned: true }])), b = computeSuggestion(board([{}, {}, {}, { pinned: true }]));
    expect(a?.fingerprint).toBe(b?.fingerprint);
    expect(computeSuggestion(board([{}, {}, {}, { pinned: true, deadline: '2027-01-01' }]))?.fingerprint).not.toBe(a?.fingerprint);
  });
  it('fills an open Now slot only when something justifies it', () => {
    const open = ws({ outcomes: all.slice(0, 4).map(id => outcome(id)), focus: lanes(['a', 'b'], ['c', 'd']) as Workspace['focus'] });
    expect(computeSuggestion(open)).toBeNull();
    expect(computeSuggestion({ ...open, outcomes: open.outcomes.map(o => (o.id === 'c' ? { ...o, pinned: true } : o)) })?.changes).toEqual([{ add: 'c', remove: null, why: 'You pinned it.' }]);
  });
  it('apply refuses a stale suggestion and never exceeds three', () => {
    const w = board([{}, {}, {}, { pinned: true }]), s = computeSuggestion(w)!;
    expect(applySuggestion(w, s)).toEqual({ now: ['a', 'b', 'd'], demoted: ['c'] });
    expect(applySuggestion({ ...w, focus: lanes(['a', 'b', 'd'], ['c', 'e']) as Workspace['focus'] }, s)).toBeNull();
  });
  it('finished outcomes are never candidates', () => {
    const w = board([{}, {}, {}, { pinned: true, done_at: 'x' }]);
    expect(rankOutcomes(w).map(f => f.id)).not.toContain('d');
  });
});

describe('state line', () => {
  it('omits zero parts and says nothing yet for an empty workspace', () => {
    expect(statusText(statusParts(ws(), 0, 0))).toBe('Nothing here yet.');
    const w = ws({ outcomes: [outcome('o')], currentFocusOutcomeId: 'o' });
    expect(statusText(statusParts(w, 0, 0))).toBe('1 current focus of up to 3 active.');
    expect(statusText(statusParts(w, 2, 0))).toBe('1 current focus of up to 3 active. 2 for the AI Assistant');
  });
});
