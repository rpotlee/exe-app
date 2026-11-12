import { describe, expect, it } from 'vitest';
import { describeAudit, impactOf, rankDecisions, whyCurrent } from './insight';
import { emptyWorkspace, type AuditEvent, type Decision, type Outcome, type Relationship, type Task, type Workspace } from './model';

const base = { owner_id: 'u', created_at: '2027-03-01T00:00:00Z', updated_at: '', revision: 1 };
const dec = (id: string, x: Partial<Decision> = {}): Decision => ({ ...base, id, folder_id: null, name: id, description: '', status: 'open', evidence: '', notes: '', chosen_option: '', conclusion: '', rationale: '', resolved_at: null, criteria: '', sources: [], ...x });
const out = (id: string, x: Partial<Outcome> = {}): Outcome => ({ ...base, id, folder_id: null, name: id, description: '', pinned: false, deadline: null, effort: null, done_at: null, last_worked_at: null, sources: [], ...x });
const task = (id: string, o: string | null, x: Partial<Task> = {}): Task => ({ ...base, id, outcome_id: o, name: id, notes: '', folder_id: null, done_at: null, archived_at: null, deadline: null, effort: null, position: 0, sources: [], group_manual: false, ...x });
const rel = (id: string, from: string, to: string, x: Partial<Relationship> = {}): Relationship => ({ ...base, id, from_type: 'decision', from_id: from, to_type: 'task', to_id: to, kind: 'blocks', description: '', confirmed: true, source: 'user', ...x });
const ws = (x: Partial<Workspace> = {}): Workspace => ({ ...emptyWorkspace(), ...x });

describe('decision queue ranking', () => {
  const w = ws({ decisions: [dec('quiet'), dec('big'), dec('urgent'), dec('suggested'), dec('done', { status: 'resolved', resolved_at: '2027-03-02T00:00:00Z' })],
    outcomes: [out('o1', { deadline: '2027-04-01' }), out('o2')], tasks: [task('t1', 'o1'), task('t2', 'o2'), task('t3', 'o2'), task('t4', 'o2')],
    relationships: [rel('r1', 'big', 't2'), rel('r2', 'big', 't3'), rel('r3', 'urgent', 't1'), rel('r4', 'suggested', 't4', { confirmed: false })] });
  it('puts the decision holding up the most confirmed work first, then the earliest real deadline', () => {
    expect(rankDecisions(w).map(r => r.decision.id)).toEqual(['big', 'urgent', 'quiet', 'suggested', 'done']);
    expect(impactOf(w, w.decisions[2]!)).toMatchObject({ held: ['t1'], earliestDeadline: '2027-04-01' });
  });
  it('a suggestion holds nothing up, finished work no longer counts, and resolved decisions go last', () => {
    expect(impactOf(w, w.decisions[3]!).held).toEqual([]);
    const done = { ...w, tasks: w.tasks.map(t => (t.id === 't2' ? { ...t, done_at: 'x' } : t)) };
    expect(impactOf(done, done.decisions[1]!).held).toEqual(['t3']);
    expect(rankDecisions(w).at(-1)!.decision.id).toBe('done');
  });
});

describe('Why this?', () => {
  it('lists only real reasons, and says when no step is ready instead of inventing one', () => {
    const w = ws({ outcomes: [out('a', { pinned: true, deadline: '2027-05-01' })], tasks: [task('s1', 'a', { done_at: 'x' })], focus: [{ ...base, id: 'f', outcome_id: 'a', lane: 'now', position: 0 }] });
    const r = whyCurrent(w, 'a', d => d);
    expect(r.lines.join(' ')).toMatch(/one of your 1 active priority/); expect(r.lines).toContain('You pinned it.'); expect(r.lines.join(' ')).toMatch(/2027-05-01/); expect(r.lines).toContain('No step is ready right now.');
    expect(whyCurrent(ws({ outcomes: [out('plain')] }), 'plain').lines).toEqual(['You chose it as the current focus.']);
  });
  it('shows a blocker only when it is a confirmed, unfinished block, with its type for the unblock action', () => {
    const w = ws({ outcomes: [out('a')], decisions: [dec('d1', { name: 'Which city?' })], relationships: [{ ...rel('r', 'd1', 'a'), to_type: 'outcome' }] });
    expect(whyCurrent(w, 'a').blockers).toEqual([{ id: 'd1', name: 'Which city?', type: 'decision' }]);
    expect(whyCurrent({ ...w, relationships: [{ ...w.relationships[0]!, confirmed: false }] }, 'a').blockers).toEqual([]);
    expect(whyCurrent({ ...w, decisions: [dec('d1', { status: 'resolved', resolved_at: 'x' })] }, 'a').blockers).toEqual([]);
  });
});

describe('history in words', () => {
  const ev = (action: string, extra: Partial<AuditEvent> = {}): AuditEvent => ({ id: 'e', owner_id: 'u', at: '2027-03-01T00:00:00Z', actor: 'user', action, entity_type: null, entity_id: null, proposal_id: null, before: null, after: null, undo_of: null, ...extra });
  const w = ws({ outcomes: [out('o1', { name: 'Plan reunion' })] });
  it('describes each kind plainly and falls back to the raw action name', () => {
    expect(describeAudit(w, ev('outcome-done', { entity_id: 'o1' }))).toBe('You confirmed the outcome “Plan reunion” is done.');
    expect(describeAudit(w, ev('priority-apply', { after: { now: ['o1'] } }))).toMatch(/Active now: Plan reunion/);
    expect(describeAudit(w, ev('folder-delete', { before: { name: 'Home', moved: 1 } }))).toMatch(/1 item was kept/);
    expect(describeAudit(w, ev('something-new'))).toBe('something-new');
  });
});
