// AI Review actions (simulation) run against memory AND the real schema, like commands.test.ts.
import { describe, expect, it } from 'vitest';
import * as C from './commands';
import { emptyWorkspace, type Workspace } from './model';
import { duplicateOf, needsPlacement, pendingCaptures, propose, proposalFingerprint, rejectedBefore, setAside } from './review';
import { applyWrites, type Ctx } from './writes';
import { asUser, freshDb, A } from '../../supabase/tests/harness.mjs';

let n = 100, clock = 0;
const ctx: Ctx = { owner: A, now: () => new Date(Date.UTC(2027, 1, 1, 0, 0, clock++)).toISOString(), id: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}` };

describe('AI Review actions', () => {
  it('propose is a simulation that never invents a folder or an outcome', () => {
    let ws: Workspace = emptyWorkspace();
    const r = C.addCaptures(ws, ctx, 'Order the balloons'); if (!r.ok) throw new Error(r.error); ws = applyWrites(ws, r.writes);
    expect(propose(ws, ws.captures[0]!)).toMatchObject({ type: 'Task', folderId: null, outcomeId: null });
    expect(propose(ws, { ...ws.captures[0]!, text: 'Should we hire a photographer?' }).type).toBe('Decision');
    expect(propose(ws, { ...ws.captures[0]!, text: 'Maybe explore a garden shed' }).type).toBe('Idea');
  });

  it('runs end to end without breaking a database rule', async () => {
    const db = await freshDb();
    await asUser(db, A, async (d: any) => {
      let ws: Workspace = emptyWorkspace();
      const ok = async (r: C.Result) => { expect(r.ok, r.ok ? '' : r.error).toBe(true); if (!r.ok) return; try { await d.query('select exe_apply_writes($1::jsonb)', [JSON.stringify(r.writes)]); } catch (e: any) { console.log('FAILED WRITES', JSON.stringify(r.writes.filter(w => w.table === 'captures'))); throw e; } ws = applyWrites(ws, r.writes); };
      const act = (id: string) => ws.captures.find(c => c.id === id)!;
      const approval = (id: string, over: Partial<C.Approval> = {}): C.Approval => { const p = propose(ws, act(id)); return { type: p.type, folderId: p.folderId, outcomeId: p.outcomeId, title: p.title, ...over }; };
      for (const t of ['Order balloons for the party', 'Order the balloons for party', 'Think about a garden shed', 'Look into a new phone plan', 'Book the caterer', 'Plan the guest list']) await ok(C.addCaptures(ws, ctx, t));
      const [a, b, shed, phone, caterer, guests] = ws.captures.map(c => c.id) as [string, string, string, string, string, string];
      expect(pendingCaptures(ws)).toHaveLength(6);

      // a likely duplicate is only proposed; merging keeps both captures, links them, and is undoable
      expect(duplicateOf(ws, act(a))?.id).toBe(b);
      expect(needsPlacement(propose(ws, act(a)))).toBe(true);
      await ok(C.mergeCaptures(ws, ctx, a, b, approval(a, { outcomeId: null })));
      expect(ws.captures).toHaveLength(6); expect(act(b)).toMatchObject({ status: 'organized', organized_as: 'Merged', merged_into: a });
      expect(ws.tasks).toHaveLength(1); expect(ws.tasks[0]!.sources.sort()).toEqual([a, b].sort());
      await ok(C.undoApproval(ws, ctx, a));
      expect(ws.tasks).toHaveLength(0); expect([act(a).status, act(b).status]).toEqual(['pending', 'pending']); expect(act(b).merged_into).toBeNull();

      // reject: the capture is untouched, leaves the list, and the same suggestion is not offered again
      const p = propose(ws, act(shed));
      await ok(C.rejectCapture(ws, ctx, shed, proposalFingerprint(p)));
      expect(act(shed)).toMatchObject({ review_state: 'rejected', text: 'Think about a garden shed' }); expect(setAside(ws).map(c => c.id)).toContain(shed);
      await ok(C.reviewAgain(ws, shed)); expect(rejectedBefore(act(shed), p)).toBe(true);
      await ok(C.approveCapture(ws, ctx, shed, approval(shed, { type: 'Idea' })));
      expect(ws.ideas).toHaveLength(1);

      // not now: kept, then back with no penalty; just a note creates nothing
      await ok(C.deferCapture(ws, ctx, phone)); expect(pendingCaptures(ws).map(c => c.id)).not.toContain(phone);
      await ok(C.reviewAgain(ws, phone)); expect(rejectedBefore(act(phone), propose(ws, act(phone)))).toBe(false);
      const counts = [ws.tasks.length, ws.outcomes.length, ws.decisions.length, ws.ideas.length];
      await ok(C.approveCapture(ws, ctx, phone, approval(phone, { type: 'Note' })));
      expect([ws.tasks.length, ws.outcomes.length, ws.decisions.length, ws.ideas.length]).toEqual(counts); expect(act(phone).organized_as).toBe('Note');

      // a step with no outcome: create one, pick one, or leave it loose; nothing is created silently
      await ok(C.approveCapture(ws, ctx, caterer, approval(caterer, { newOutcomeName: 'Event vendors' })));
      const outcome = ws.outcomes.find(o => o.name === 'Event vendors')!;
      expect(outcome.sources).toEqual([caterer]); expect(ws.focus.find(f => f.outcome_id === outcome.id)?.lane).toBe('later');
      expect(ws.tasks.find(t => t.name === 'Book the caterer')?.outcome_id).toBe(outcome.id);
      await ok(C.approveCapture(ws, ctx, guests, approval(guests, { outcomeId: outcome.id })));
      expect(ws.outcomes).toHaveLength(1); expect(ws.tasks.find(t => t.name === 'Plan the guest list')?.outcome_id).toBe(outcome.id);
      expect(C.approveCapture(ws, ctx, guests, approval(guests)).ok).toBe(false);                 // already organized

      // undo works while untouched and is refused once the work has moved on
      await ok(C.undoApproval(ws, ctx, guests)); expect(ws.tasks.find(t => t.name === 'Plan the guest list')).toBeUndefined();
      await ok(C.approveCapture(ws, ctx, guests, approval(guests, { outcomeId: outcome.id })));
      await ok(C.setTaskDone(ws, ctx, ws.tasks.find(t => t.name === 'Plan the guest list')!.id, true));
      const refused = C.undoApproval(ws, ctx, guests); expect(refused.ok).toBe(false); if (!refused.ok) expect(refused.error).toMatch(/worked on/);
      // undoing the caterer step also takes back the outcome it created, but only when nothing else is in it
      await ok(C.undoApproval(ws, ctx, caterer)); expect(ws.tasks.find(t => t.name === 'Book the caterer')).toBeUndefined();
      expect(ws.outcomes).toHaveLength(1);                                                         // the guest step is in it, so the outcome stays
      // one capture becomes several items, only when asked; nothing is lost and it can be undone while untouched
      await ok(C.addCaptures(ws, ctx, 'Call the venue and ask about the date, then decide whether to book a band'));
      const big = ws.captures.at(-1)!;
      expect(C.splitCapture(ws, ctx, big.id, [{ type: 'Task', folderId: null, outcomeId: null, title: 'Call the venue' }]).ok).toBe(false);          // one item is not a split
      await ok(C.splitCapture(ws, ctx, big.id, [{ type: 'Task', folderId: null, outcomeId: null, title: 'Call the venue about the date' }, { type: 'Decision', folderId: null, outcomeId: null, title: 'Book a band?' }]));
      expect(act(big.id)).toMatchObject({ status: 'organized', organized_as: 'Split', text: big.text });
      const kids = [ws.tasks.find(t => t.name === 'Call the venue about the date')!, ws.decisions.find(x => x.name === 'Book a band?')!];
      expect(kids.every(k => k.sources.includes(big.id))).toBe(true);
      await ok(C.undoApproval(ws, ctx, big.id));
      expect(ws.tasks.find(t => t.name === 'Call the venue about the date')).toBeUndefined(); expect(ws.decisions.find(x => x.name === 'Book a band?')).toBeUndefined(); expect(act(big.id).status).toBe('pending');
      await ok(C.splitCapture(ws, ctx, big.id, [{ type: 'Task', folderId: null, outcomeId: null, title: 'Call the venue about the date' }, { type: 'Idea', folderId: null, outcomeId: null, title: 'A band?' }]));
      await ok(C.setTaskDone(ws, ctx, ws.tasks.find(t => t.name === 'Call the venue about the date')!.id, true));
      const refusedSplit = C.undoApproval(ws, ctx, big.id); expect(refusedSplit.ok).toBe(false); if (!refusedSplit.ok) expect(refusedSplit.error).toMatch(/worked on/);
      // decision comparison notes and criteria are plain text the person writes
      await ok(C.createDecision(ws, ctx, { name: 'Which band?', folderId: null }));
      const dd = ws.decisions.find(x => x.name === 'Which band?')!; await ok(C.addOption(ws, ctx, dd.id, 'Jazz trio'));
      await ok(C.setDecisionText(ws, dd.id, 'criteria', 'Budget under 800; can play outdoors'));
      await ok(C.setOptionNotes(ws, ws.decisionOptions[0]!.id, { pros: 'Quiet enough to talk', cons: 'No dance floor' }));
      expect(ws.decisionOptions[0]).toMatchObject({ pros: 'Quiet enough to talk', cons: 'No dance floor' }); expect(ws.decisions.find(x => x.id === dd.id)!.criteria).toMatch(/Budget/);
      expect((await d.query(`select action from audit_events where action = 'approval-undo'`)).rows).toHaveLength(4);
    });
  }, 120_000);
});
