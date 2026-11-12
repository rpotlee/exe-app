import { describe, expect, it } from 'vitest';
import { addCaptures, addOutcome, addTask, applyGroupMatches, moveGroupEntry, type Result } from './commands';
import { emptyWorkspace, type Workspace } from './model';
import { applyWrites, type Ctx } from './writes';
import { asUser, freshDb, A } from '../../supabase/tests/harness.mjs';

let serial = 0;
const ctx: Ctx = { owner: A, now: () => '2027-01-01T00:00:00Z', id: () => `10000000-0000-4000-8000-${String(++serial).padStart(12, '0')}` };
function use(ws: Workspace, result: Result): Workspace { expect(result.ok, result.ok ? '' : result.error).toBe(true); return result.ok ? applyWrites(ws, result.writes) : ws; }

describe('Groups matching and manual placement', () => {
  it('moves a capture to a new group and preserves its original and completion', () => {
    let ws = use(emptyWorkspace(), addCaptures(emptyWorkspace(), ctx, 'Prepare launch notes'));
    const cap = ws.captures[0]!;
    ws = use(ws, moveGroupEntry(ws, ctx, `c${cap.id}`, { newName: 'Launch' }));
    expect(ws.captures[0]).toMatchObject({ text: 'Prepare launch notes', status: 'organized' });
    expect(ws.tasks[0]).toMatchObject({ name: 'Prepare launch notes', outcome_id: ws.outcomes[0]!.id, group_manual: true, sources: [cap.id] });
    expect(ws.outcomes[0]!.name).toBe('Launch');
  });

  it('keeps an intentional move to Ungrouped and ignores stale or duplicate AI matches', () => {
    let ws = emptyWorkspace();
    ws = use(ws, addOutcome(ws, ctx, { folderId: null, name: 'Launch', description: '' }));
    const outcome = ws.outcomes[0]!;
    ws = use(ws, addTask(ws, ctx, null, 'Prepare launch notes'));
    const task = ws.tasks[0]!;
    const match = { kind: 'task' as const, id: task.id, outcomeId: outcome.id, sourceRevision: task.revision, outcomeRevision: outcome.revision };
    ws = use(ws, applyGroupMatches(ws, ctx, [match, match]));
    expect(ws.tasks[0]).toMatchObject({ outcome_id: outcome.id, group_manual: false });
    const after = ws;
    ws = use(ws, applyGroupMatches(ws, ctx, [match]));
    expect(ws.tasks).toEqual(after.tasks);
    ws = use(ws, moveGroupEntry(ws, ctx, `t${task.id}`, { outcomeId: null }));
    expect(ws.tasks[0]).toMatchObject({ outcome_id: null, group_manual: true });
    ws = use(ws, applyGroupMatches(ws, ctx, [{ ...match, sourceRevision: ws.tasks[0]!.revision }]));
    expect(ws.tasks[0]!.outcome_id).toBeNull();
  });

  it('applies manual and AI moves against the real database schema', async () => {
    const db = await freshDb();
    await asUser(db, A, async d => {
      let ws = emptyWorkspace();
      const run = async (result: Result) => {
        expect(result.ok, result.ok ? '' : result.error).toBe(true);
        if (!result.ok) return;
        await d.query('select exe_apply_writes($1::jsonb)', [JSON.stringify(result.writes)]);
        ws = applyWrites(ws, result.writes);
      };
      await run(addOutcome(ws, ctx, { folderId: null, name: 'Project', description: '' }));
      await run(addTask(ws, ctx, null, 'Project task'));
      const id = ws.tasks[0]!.id, oid = ws.outcomes[0]!.id;
      await run(addTask(ws, ctx, null, 'Another project task'));
      const aiTask = ws.tasks[1]!;
      await run(applyGroupMatches(ws, ctx, [{ kind: 'task', id: aiTask.id, outcomeId: oid, sourceRevision: aiTask.revision, outcomeRevision: ws.outcomes[0]!.revision }]));
      expect((await d.query('select outcome_id,group_manual from tasks where id=$1', [aiTask.id])).rows[0]).toMatchObject({ outcome_id: oid, group_manual: false });
      await run(moveGroupEntry(ws, ctx, `t${id}`, { outcomeId: oid }));
      expect((await d.query('select outcome_id,group_manual from tasks where id=$1', [id])).rows[0]).toMatchObject({ outcome_id: oid, group_manual: true });
      await run(moveGroupEntry(ws, ctx, `t${id}`, { outcomeId: null }));
      expect((await d.query('select outcome_id,group_manual from tasks where id=$1', [id])).rows[0]).toMatchObject({ outcome_id: null, group_manual: true });
      await run(applyGroupMatches(ws, ctx, [{ kind: 'task', id, outcomeId: oid, sourceRevision: ws.tasks[0]!.revision, outcomeRevision: ws.outcomes[0]!.revision }]));
      expect((await d.query('select outcome_id from tasks where id=$1', [id])).rows[0].outcome_id).toBeNull();
    });
  }, 15_000);
});
