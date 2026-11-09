import { describe, expect, it } from 'vitest';
import { emptyWorkspace, type Outcome, type Relationship, type Task, type Workspace } from './model';
import { parseEffort, prompts, quickWin } from './next';
import { isoWeek, weeklySummary } from './weekly';

const base = { owner_id: 'u', created_at: '2027-03-01T00:00:00Z', updated_at: '', revision: 1 };
const outcome = (id: string, x: Partial<Outcome> = {}): Outcome => ({ ...base, id, folder_id: null, name: id, description: '', pinned: false, deadline: null, effort: null, done_at: null, last_worked_at: null, sources: [], ...x });
const task = (id: string, o: string | null, x: Partial<Task> = {}): Task => ({ ...base, id, outcome_id: o, name: id, notes: '', folder_id: null, done_at: null, archived_at: null, deadline: null, effort: null, position: 0, sources: [], ...x });
const rel = (id: string, from: string, to: string, x: Partial<Relationship> = {}): Relationship => ({ ...base, id, from_type: 'task', from_id: from, to_type: 'task', to_id: to, kind: 'blocks', description: '', confirmed: true, source: 'user', ...x });
const lane = (o: string, l: string) => ({ ...base, id: 'f' + o, outcome_id: o, lane: l, position: 0 });
const ws = (x: Partial<Workspace> = {}): Workspace => ({ ...emptyWorkspace(), ...x });

describe('parseEffort', () => {
  it('reads the user\'s own words, and returns null when there is no number', () => {
    expect(parseEffort('20 min')).toBe(20); expect(parseEffort('about 3 hours')).toBe(180); expect(parseEffort('1.5h')).toBe(90); expect(parseEffort('half an hour')).toBe(30); expect(parseEffort('45m')).toBe(45);
    expect(parseEffort('a while')).toBeNull(); expect(parseEffort(null)).toBeNull(); expect(parseEffort('')).toBeNull();
  });
});

describe('quickWin: "I have N minutes"', () => {
  it('prefers a step known to fit, in an active priority, and explains why', () => {
    const w = ws({ outcomes: [outcome('a'), outcome('b')], focus: [lane('a', 'next'), lane('b', 'now')] as Workspace['focus'],
      tasks: [task('a1', 'a', { effort: '10 min' }), task('b1', 'b', { effort: '15 min' }), task('b2', 'b')] });
    const r = quickWin(w, 20)!;
    expect(r.task.id).toBe('b1'); expect(r.estimate).toBe(15); expect(r.reason).toMatch(/fits in 20/); expect(r.reason).toMatch(/active priorities/);
  });
  it('skips steps known not to fit, blocked steps, and finished work; never invents an estimate', () => {
    const w = ws({ outcomes: [outcome('a')], focus: [lane('a', 'now')] as Workspace['focus'],
      tasks: [task('long', 'a', { effort: '3 hours' }), task('blocked', 'a', { effort: '5 min' }), task('prereq', 'a'), task('done', 'a', { done_at: 'x', effort: '5 min' }), task('unknown', 'a')],
      relationships: [rel('r', 'prereq', 'blocked')] });
    const r = quickWin(w, 20)!; expect(r.task.id).not.toBe('long'); expect(r.task.id).not.toBe('blocked'); expect(r.task.id).not.toBe('done');
    const onlyUnknown = quickWin(ws({ ...w, tasks: [task('unknown', 'a')] }), 20)!;
    expect(onlyUnknown.estimate).toBeNull(); expect(onlyUnknown.reason).toMatch(/not given it an estimate/);
  });
  it('can suggest a step elsewhere while a blocked outcome stays Now, and changes nothing', () => {
    const w = ws({ outcomes: [outcome('big'), outcome('small')], focus: [lane('big', 'now'), lane('small', 'next')] as Workspace['focus'],
      tasks: [task('prereq', null), task('b1', 'big', { effort: '5 min' }), task('s1', 'small', { effort: '15 min' })],
      relationships: [{ ...rel('r', 'prereq', 'big'), to_type: 'outcome' }] });
    const before = JSON.stringify(w); const r = quickWin(w, 20)!;
    expect(r.task.id).toBe('s1'); expect(JSON.stringify(w)).toBe(before);
  });
  it('returns nothing rather than pretending when nothing is feasible', () => { expect(quickWin(ws(), 20)).toBeNull(); expect(quickWin(ws({ outcomes: [outcome('a')], tasks: [task('x', 'a', { effort: '2 hours' })] }), 20)).toBeNull(); });
});

describe('prompts after changes', () => {
  const now = Date.parse('2027-03-10T00:00:00Z');
  it('a resolved decision that was holding things up says so, and only until dismissed', () => {
    const d = { ...base, id: 'd1', folder_id: null, name: 'Which city?', description: '', status: 'resolved', evidence: '', notes: '', chosen_option: '', conclusion: 'X', rationale: '', resolved_at: '2027-03-09T00:00:00Z', criteria: '', sources: [] };
    const w = ws({ decisions: [d], tasks: [task('t', null)], relationships: [{ ...rel('r', 'd1', 't'), from_type: 'decision' }] });
    const p = prompts(w, now); expect(p).toHaveLength(1); expect(p[0]).toMatchObject({ kind: 'decision', page: 'decisions', targetId: 'd1' }); expect(p[0]!.text).toMatch(/Nothing was changed/);
    expect(prompts({ ...w, settings: { ...base, workspace_name: '', current_focus_outcome_id: null, priority_dismissed: [p[0]!.id], research_opt_in: false } as Workspace['settings'] }, now)).toEqual([]);
    expect(prompts({ ...w, relationships: [{ ...w.relationships[0]!, confirmed: false }] }, now)).toEqual([]);          // a suggestion held nothing up
  });
  it('finishing a blocking step says what it cleared; an unconfirmed edge says nothing', () => {
    const w = ws({ tasks: [task('a', null, { done_at: '2027-03-09T00:00:00Z' }), task('b', null)], relationships: [rel('r', 'a', 'b')] });
    expect(prompts(w, now)[0]).toMatchObject({ kind: 'unblocked' }); expect(prompts({ ...w, relationships: [rel('r', 'a', 'b', { confirmed: false })] }, now)).toEqual([]);
    expect(prompts({ ...w, tasks: [w.tasks[0]!, task('b', null, { done_at: 'x' })] }, now)).toEqual([]);                  // the target is already finished
  });
  it('all steps done asks whether the outcome is finished (never decides)', () => {
    const w = ws({ outcomes: [outcome('o')], tasks: [task('s1', 'o', { done_at: '2027-03-09T00:00:00Z' })] });
    expect(prompts(w, now)[0]).toMatchObject({ kind: 'finished', targetId: 'o' }); expect(prompts({ ...w, outcomes: [outcome('o', { done_at: 'x' })] }, now)).toEqual([]);
  });
});

describe('weekly review', () => {
  it('labels ISO weeks correctly across a year boundary', () => { expect(isoWeek(new Date('2027-01-01T12:00:00Z'))).toBe('2026-W53'); expect(isoWeek(new Date('2027-03-10T12:00:00Z'))).toBe('2027-W10'); });
  it('reports only what really happened in the last 7 days', () => {
    const now = new Date('2027-03-10T12:00:00Z');
    const w = ws({ outcomes: [outcome('o', { done_at: '2027-03-08T00:00:00Z' })], tasks: [task('a', 'o', { done_at: '2027-03-09T00:00:00Z' }), task('b', 'o', { done_at: '2027-02-01T00:00:00Z' })],
      captures: [{ ...base, id: 'c', created_at: '2027-03-09T00:00:00Z', kind: 'todo', display_title: null, user_priority: null, remind_at: null, remind_done_at: null, text: 'x', edited_text: null, source: '', folder_id: null, batch_id: null, batch_text: null, completed_at: null, archived_at: null, status: 'pending', organized_as: null, review_state: null, review_at: null, rejected_fingerprints: [], task_id: null, merged_into: null }] });
    const s = weeklySummary(w, now);
    expect(s.stepsDone).toEqual([{ outcomeId: 'o', name: 'o', count: 1 }]); expect(s.outcomesDone).toEqual(['o']); expect(s.capturesAdded).toBe(1); expect(s.waitingReview).toBe(1); expect(s.anything).toBe(true);
    expect(weeklySummary(ws(), now).anything).toBe(false);
  });
});
