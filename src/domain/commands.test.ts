// Runs every command against BOTH the in-memory workspace and the real database schema (in-process Postgres),
// and requires that they agree and that no command ever trips a database rule.
import { describe, expect, it } from 'vitest';
import * as C from './commands';
import { computeSuggestion } from './engine';
import { emptyWorkspace, type Workspace } from './model';
import { applyWrites, pk, type Ctx, type Write } from './writes';
import { asUser, freshDb, A } from '../../supabase/tests/harness.mjs';

let n = 0, clock = 0;
const ctx: Ctx = { owner: A, now: () => new Date(Date.UTC(2027, 0, 1, 0, 0, clock++)).toISOString(), id: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}` };

const JSON_COLS = new Set(['before', 'after']);
async function toDb(db: any, w: Write) {
  const keys = Object.keys(w.row), key = pk(w.table);
  const val = (k: string) => (JSON_COLS.has(k) ? JSON.stringify(w.row[k]) : w.row[k]);
  if (w.op === 'insert') return db.query(`insert into ${w.table} (${keys.join(',')}) values (${keys.map((_, i) => `$${i + 1}`).join(',')})`, keys.map(val));
  if (w.op === 'delete') return db.query(`delete from ${w.table} where ${key} = $1`, [w.row[key]]);
  const sets = keys.filter(k => k !== key && k !== 'revision');
  const r = await db.query(`update ${w.table} set ${sets.map((k, i) => `${k} = $${i + 1}`).join(',')} where ${key} = $${sets.length + 1} and revision = $${sets.length + 2}`, [...sets.map(val), w.row[key], w.row.revision]);
  if (r.affectedRows !== 1) throw new Error(`conflict: ${w.table} ${String(w.row[key])} changed underneath us`);
}

/** The columns that must agree between memory and the database (timestamps are set by each side's own clock). */
const FIELDS: Record<string, (r: any) => unknown> = {
  folders: r => [r.id, r.name, r.position], outcomes: r => [r.id, r.name, r.folder_id, r.pinned, !!r.done_at, r.deadline ? String(r.deadline).slice(0, 10) : null, !!r.last_worked_at],
  focus_assignments: r => [r.outcome_id, r.lane], tasks: r => [r.id, r.outcome_id, r.name, r.position, !!r.done_at, !!r.archived_at],
  captures: r => [r.id, r.text, r.edited_text, r.folder_id, !!r.completed_at, !!r.archived_at, r.batch_id, r.status], relationships: r => [r.id, r.from_id, r.to_id, r.kind, r.confirmed],
};
const MEM: Record<string, keyof Workspace> = { folders: 'folders', outcomes: 'outcomes', focus_assignments: 'focus', tasks: 'tasks', captures: 'captures', relationships: 'relationships' };
const norm = (rows: any[], t: string) => JSON.stringify(rows.map(FIELDS[t] as any).map(x => JSON.stringify(x)).sort());

describe('commands: memory and database agree, and no rule is ever tripped', () => {
  it('runs a full scenario', async () => {
    const db = await freshDb();
    await asUser(db, A, async (d: any) => {
      let ws: Workspace = emptyWorkspace();
      const run = async (r: C.Result): Promise<C.Result> => {
        if (!r.ok) return r;
        for (const w of r.writes) await toDb(d, w);         // throws if the database refuses
        ws = applyWrites(ws, r.writes);
        for (const t of Object.keys(FIELDS)) {
          const rows = (await d.query(`select to_jsonb(x) as j from ${t} x`)).rows.map((r: any) => r.j);
          expect(norm(ws[MEM[t] as keyof Workspace] as any[], t), `${t} after ${r.writes.map(w => w.op + ' ' + w.table).join(', ')}`).toBe(norm(rows, t));
        }
        const s = (await d.query('select current_focus_outcome_id f from user_settings')).rows[0];
        expect(ws.settings?.current_focus_outcome_id ?? null).toBe(s ? s.f : null);
        return r;
      };
      const ok = async (r: C.Result) => { const x = await run(r); expect(x.ok, x.ok ? '' : (x as any).error).toBe(true); };

      // captures: a list splits, a paragraph stays one; raw completion, filing, archive
      await ok(C.addCaptures(ws, ctx, 'Call the plumber\nBook flights\nRenew passport'));
      await ok(C.addCaptures(ws, ctx, 'I keep wondering ' + 'word '.repeat(30) + '\nand the second line also runs ' + 'long '.repeat(30)));
      expect(ws.captures).toHaveLength(4);
      expect(new Set(ws.captures.slice(0, 3).map(c => c.batch_id)).size).toBe(1);
      expect(C.addCaptures(ws, ctx, '   ').ok).toBe(false);
      const cap = ws.captures[0]!;
      await ok(C.setCaptureDone(ws, ctx, cap.id, true));
      expect(ws.tasks).toHaveLength(0);                                    // raw completion touches nothing else
      await ok(C.editCapture(ws, cap.id, 'Call the plumber today'));
      expect(ws.captures[0]).toMatchObject({ text: 'Call the plumber', edited_text: 'Call the plumber today' });

      // folders and outcomes
      await ok(C.createFolder(ws, ctx, 'Home')); await ok(C.createFolder(ws, ctx, 'Work'));
      const [home, work] = ws.folders as [typeof ws.folders[0], typeof ws.folders[0]];
      await ok(C.fileCapture(ws, cap.id, home.id));
      for (const name of ['o1', 'o2', 'o3', 'o4', 'o5']) await ok(C.addOutcome(ws, ctx, { folderId: home.id, name, description: 'done when done' }));
      const [o1, o2, o3, o4, o5] = ws.outcomes as typeof ws.outcomes[0][] as [any, any, any, any, any];
      for (const o of [o1, o2, o3]) await ok(C.setLane(ws, ctx, o.id, 'now'));
      expect(ws.settings?.current_focus_outcome_id).toBe(o3.id);
      const blocked = C.setLane(ws, ctx, o4.id, 'now');                    // a 4th Now is refused with an explanation
      expect(blocked).toMatchObject({ ok: false, needsSwap: true });
      await ok(C.swapNow(ws, ctx, o1.id, o4.id));
      expect(ws.focus.filter(f => f.lane === 'now').map(f => f.outcome_id).sort()).toEqual([o2.id, o3.id, o4.id].sort());
      await ok(C.selectCurrentFocus(ws, ctx, o2.id));
      expect(C.selectCurrentFocus(ws, ctx, o5.id).ok).toBe(false);
      await ok(C.setLane(ws, ctx, o2.id, 'later'));                        // leaving Now clears/moves the current focus
      expect(ws.settings?.current_focus_outcome_id).not.toBe(o2.id);

      // steps: add, check, reorder, move, archive; finishing every step only ASKS about the outcome
      for (const name of ['s1', 's2', 's3']) await ok(C.addTask(ws, ctx, o3.id, name));
      const [s1, s2, s3] = ws.tasks as [any, any, any];
      await ok(C.setTaskDone(ws, ctx, s1.id, true));
      expect(ws.outcomes.find(o => o.id === o3.id)?.last_worked_at).toBeTruthy();
      await ok(C.moveTask(ws, s3.id, 'up'));
      expect(ws.tasks.filter(t => t.outcome_id === o3.id).sort((a, b) => a.position - b.position).map(t => t.name)).toEqual(['s1', 's3', 's2']);
      await ok(C.editTask(ws, s2.id, { name: 'step two', outcomeId: o4.id }));
      expect(C.allStepsDone(ws, o3.id)).toBe(false);
      await ok(C.setTaskDone(ws, ctx, s3.id, true));
      expect(C.allStepsDone(ws, o3.id)).toBe(true);
      expect(ws.outcomes.find(o => o.id === o3.id)?.done_at).toBeNull();   // not done until the user confirms
      await ok(C.archiveTask(ws, ctx, s1.id, true)); await ok(C.archiveTask(ws, ctx, s1.id, false));

      // relationships: loops and self-blocks are explained and never reach the database
      await ok(C.addRelationship(ws, ctx, { from: s1.id, to: s2.id, kind: 'blocks', confirmed: true }));
      await ok(C.addRelationship(ws, ctx, { from: s2.id, to: s3.id, kind: 'blocks', confirmed: false }));
      expect(C.addRelationship(ws, ctx, { from: s3.id, to: s1.id, kind: 'blocks', confirmed: true })).toMatchObject({ ok: false });
      expect(C.addRelationship(ws, ctx, { from: s1.id, to: s1.id, kind: 'blocks', confirmed: true })).toMatchObject({ ok: false });
      await ok(C.confirmRelationship(ws, ws.relationships[1]!.id));
      expect(C.addRelationship(ws, ctx, { from: s3.id, to: s1.id, kind: 'blocks', confirmed: true }).ok).toBe(false);
      await ok(C.removeRelationship(ws, ws.relationships[1]!.id));

      // Priority Engine: suggestion -> user applies; ignoring is remembered
      await ok(C.togglePin(ws, o5.id));
      await ok(C.setLane(ws, ctx, o5.id, 'next'));
      const sg = computeSuggestion(ws, d => d)!; expect(sg.changes[0]).toMatchObject({ add: o5.id, why: 'You pinned it.' });
      await ok(C.ignoreSuggestion(ws, ctx, sg.fingerprint));
      expect(ws.settings?.priority_dismissed).toContain(sg.fingerprint);
      await ok(C.applyPriority(ws, ctx, sg));
      expect(ws.focus.find(f => f.outcome_id === o5.id)?.lane).toBe('now');
      expect(C.applyPriority(ws, ctx, sg).ok).toBe(false);                 // now stale

      // completion: only on confirmation; frees the slot; reopening goes to Later
      await ok(C.completeOutcome(ws, ctx, o3.id));
      expect(ws.focus.find(f => f.outcome_id === o3.id)?.lane).toBe('done');
      await ok(C.reopenOutcome(ws, ctx, o3.id));
      expect(ws.focus.find(f => f.outcome_id === o3.id)?.lane).toBe('later');

      // deleting a folder moves its contents; nothing inside is deleted
      const before = { outcomes: ws.outcomes.length, captures: ws.captures.length };
      await ok(C.deleteFolder(ws, ctx, home.id, work.id));
      expect({ outcomes: ws.outcomes.length, captures: ws.captures.length }).toEqual(before);
      expect(ws.outcomes.every(o => o.folder_id === work.id)).toBe(true);
      await ok(C.updateOutcome(ws, o4.id, { name: 'renamed', description: 'dod', folderId: null, deadline: '2027-03-01', effort: ' 3 hours ' }));
      await ok(C.setWorkspaceName(ws, ctx, ' Taylor home '));
      expect(ws.settings?.workspace_name).toBe('Taylor home');
      const audits = (await d.query('select action from audit_events order by at')).rows.map((r: any) => r.action);
      expect(audits).toEqual(expect.arrayContaining(['folder-delete', 'priority-apply', 'outcome-done']));
    });
  }, 120_000);
});
