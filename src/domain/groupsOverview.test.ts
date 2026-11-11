import { describe, expect, it } from 'vitest';
import { emptyWorkspace, type Capture, type Outcome, type Task, type Workspace } from './model';
import { ALL } from './scope';
import { deadlineEnd, progressOf, scheduleSummary } from './groupsOverview';
import type { MissionGroup, MissionTask } from './mission';

const task = (id: string, done: boolean): MissionTask => ({ key: `t${id}`, id, kind: 'task', captureId: null, text: id, done, level: null, fromAi: false, why: '' });
const group = (id: string, tasks: MissionTask[]): MissionGroup => ({ id, name: id, kind: 'outcome', outcomeId: id, lane: null, captureIds: [], tasks, updatedAt: null });
const meta = { owner_id: 'owner', created_at: '2026-11-10T00:00:00Z', updated_at: '2026-11-10T00:00:00Z', revision: 1 };
const cap = (id: string, at: string, extra: Partial<Capture> = {}): Capture => ({ ...meta, id, text: id, edited_text: null, source: '', folder_id: null, batch_id: null, batch_text: null, completed_at: null, archived_at: null, status: 'pending', organized_as: null, review_state: null, review_at: null, rejected_fingerprints: [], task_id: null, merged_into: null, kind: 'todo', display_title: null, user_priority: null, remind_at: at, remind_done_at: null, ...extra });
const step = (id: string, deadline: string, sources: string[] = []): Task => ({ ...meta, id, outcome_id: null, name: id, notes: '', folder_id: null, done_at: null, archived_at: null, deadline, effort: null, position: 0, sources });
const outcome = (id: string, deadline: string): Outcome => ({ ...meta, id, folder_id: null, name: id, description: '', pinned: false, deadline, effort: null, done_at: null, last_worked_at: null, sources: [] });

describe('Groups overview calculations', () => {
  it('counts each completable entry once across groups', () => {
    const a = task('a', true), b = task('b', false);
    expect(progressOf([group('one', [a,b]),group('two',[b])])).toEqual({ completed: 1, remaining: 1, total: 2, percent: 50 });
    expect(progressOf([group('empty', [])])).toEqual({ completed: 0, remaining: 0, total: 0, percent: 0 });
  });
  it('uses real local-day deadlines and active reminders, deduplicating an entry and its task', () => {
    const today = new Date(2026,10,10,12).getTime();
    const morning = new Date(2026,10,10,9).toISOString();
    const tomorrow = new Date(2026,10,11,9).toISOString();
    const ws: Workspace = { ...emptyWorkspace(),
      outcomes: [outcome('late outcome','2026-11-09'),outcome('today outcome','2026-11-10')],
      tasks: [step('linked task','2026-11-11',['linked']),step('future task','2026-11-20')],
      captures: [cap('linked',morning),cap('soon',tomorrow),cap('dismissed',morning,{ remind_done_at: tomorrow }),cap('note',morning,{ kind: 'note' })] };
    const result = scheduleSummary(ws, ALL, today);
    expect(result.missed.map(x => x.title)).toEqual(['late outcome','linked']);
    expect(result.upcoming.map(x => x.title)).toEqual(['today outcome','soon']);
    expect(deadlineEnd('2026-11-10')).toBe(new Date(2026,10,11).getTime());
    expect(deadlineEnd('2026-02-30')).toBeNull();
  });
});
