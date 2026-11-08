// Runs every command against BOTH the in-memory workspace and the real database schema (in-process Postgres),
// and requires that they agree and that no command ever trips a database rule.
import { describe, expect, it } from 'vitest';
import * as C from './commands';
import { computeSuggestion } from './engine';
import { emptyWorkspace, type Workspace } from './model';
import { applyWrites, type Ctx, type Write } from './writes';
import { asUser, freshDb, A } from '../../supabase/tests/harness.mjs';

let n = 0, clock = 0;
const ctx: Ctx = { owner: A, now: () => new Date(Date.UTC(2027, 0, 1, 0, 0, clock++)).toISOString(), id: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}` };

/** One command = one all-or-nothing call, exactly as the app sends it. */
async function toDb(db: any, writes: Write[]) {
  try { await db.query('select exe_apply_writes($1::jsonb)', [JSON.stringify(writes)]); }
  catch (e: any) { throw new Error(String(e.message)); }
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
        await toDb(d, r.writes);                              // throws if the database refuses
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
      // decisions: options, evidence, resolve, reopen; the log is dated and only the user resolves
      await ok(C.createDecision(ws, ctx, { name: 'Which CRM?', folderId: work.id }));
      const dec = ws.decisions[0]!;
      await ok(C.addOption(ws, ctx, dec.id, 'HubSpot')); await ok(C.addOption(ws, ctx, dec.id, 'Pipedrive'));
      expect(C.addOption(ws, ctx, dec.id, ' hubspot ').ok).toBe(false);
      await ok(C.setDecisionText(ws, dec.id, 'evidence', 'free tier checked'));
      const [opt1, opt2] = C.optionsOf(ws, dec.id) as [any, any];
      await ok(C.renameOption(ws, ctx, opt1.id, 'HubSpot CRM'));
      expect(C.resolveDecision(ws, ctx, dec.id, { chosenOption: '', conclusion: ' ', rationale: '' }).ok).toBe(false);
      await ok(C.resolveDecision(ws, ctx, dec.id, { chosenOption: 'HubSpot CRM', conclusion: 'Use HubSpot', rationale: 'cheapest' }));
      expect(ws.decisions[0]).toMatchObject({ status: 'resolved', chosen_option: 'HubSpot CRM' });
      expect(C.removeOption(ws, ctx, opt1.id).ok).toBe(false);             // the chosen option cannot be removed while resolved
      expect(C.resolveDecision(ws, ctx, dec.id, { chosenOption: '', conclusion: 'again', rationale: '' }).ok).toBe(false);
      await ok(C.reopenDecision(ws, ctx, dec.id)); await ok(C.removeOption(ws, ctx, opt2.id));
      expect((await d.query('select type from decision_log order by at')).rows.map((r: any) => r.type)).toEqual(['created', 'edited', 'resolved', 'reopened', 'edited']);
      expect(ws.tasks.every(t => t.done_at === null || t.id === s1.id || t.id === s3.id)).toBe(true);   // resolving never completed any work
      // several steps at once, a step's own estimate, prompt dismissals, and ideas (create, edit, archive, promote)
      await ok(C.addTasks(ws, ctx, o4.id, ['Draft the list', 'Call two venues', ' draft the list ', '']));
      expect(ws.tasks.filter(t => t.outcome_id === o4.id).map(t => t.name)).toEqual(expect.arrayContaining(['Draft the list', 'Call two venues']));
      expect(C.addTasks(ws, ctx, o4.id, ['Draft the list']).ok).toBe(false); expect(C.addTasks(ws, ctx, o4.id, ['  ']).ok).toBe(false);
      const draft = ws.tasks.find(t => t.name === 'Draft the list')!;
      await ok(C.editTask(ws, draft.id, { name: 'Draft the guest list', outcomeId: o4.id, effort: ' 15 min ', notes: 'start with family', deadline: '2027-04-01' }));
      expect(ws.tasks.find(t => t.id === draft.id)).toMatchObject({ effort: '15 min', notes: 'start with family' });
      await ok(C.dismissPrompt(ws, ctx, 'decision:abc:2027-01-01')); await ok(C.dismissPrompt(ws, ctx, 'decision:abc:2027-01-01'));
      expect(ws.settings?.priority_dismissed.filter(x => x === 'decision:abc:2027-01-01')).toHaveLength(1);
      await ok(C.createIdea(ws, ctx, { name: 'Offer Spanish materials', notes: 'later', folderId: null }));
      expect(C.createIdea(ws, ctx, { name: '  ', folderId: null }).ok).toBe(false);
      const ide = ws.ideas[0]!;
      await ok(C.editIdea(ws, ide.id, { name: 'Offer Spanish-language materials', notes: 'after launch', folderId: work.id }));
      await ok(C.archiveIdea(ws, ctx, ide.id, true)); expect(ws.ideas[0]!.archived_at).toBeTruthy(); await ok(C.archiveIdea(ws, ctx, ide.id, false));
      const outcomesBefore = ws.outcomes.length;
      await ok(C.promoteIdea(ws, ctx, ide.id));                                 // only on the user's explicit act
      const promoted = ws.outcomes.find(o => o.sources.includes(ide.id))!;
      expect(ws.outcomes).toHaveLength(outcomesBefore + 1); expect(promoted).toMatchObject({ name: 'Offer Spanish-language materials', folder_id: work.id, description: 'after launch' });
      expect(ws.focus.find(f => f.outcome_id === promoted.id)?.lane).toBe('later'); expect(ws.ideas[0]!.archived_at).toBeTruthy();
      // group related to-dos (live help): one outcome in Later, the to-dos become its steps, suggested dependencies stay UNCONFIRMED
      await ok(C.addCaptures(ws, ctx, 'Email Rachel about the open role\nPrepare interview questions\nBuy a standing desk'));
      const g = ws.captures.filter(c => c.status === 'pending' && /Rachel|interview/.test(c.text)), desk = ws.captures.find(c => /standing desk/.test(c.text))!;
      expect(C.groupCaptures(ws, ctx, { ids: [g[0]!.id], name: 'Hiring', deps: [] }).ok).toBe(false);          // needs two
      expect(C.groupCaptures(ws, ctx, { ids: [g[0]!.id, g[1]!.id], name: ' ', deps: [] }).ok).toBe(false);     // needs a name
      await ok(C.groupCaptures(ws, ctx, { ids: [g[0]!.id, g[1]!.id], name: 'Hiring', deps: [{ before: g[0]!.id, after: g[1]!.id, why: 'Reply first' }, { before: g[1]!.id, after: g[0]!.id, why: 'would loop' }] }));
      const hiring = ws.outcomes.find(o => o.name === 'Hiring')!, steps = ws.tasks.filter(t => t.outcome_id === hiring.id);
      expect(steps.map(t => t.name)).toEqual(['Email Rachel about the open role', 'Prepare interview questions']); expect(ws.focus.find(f => f.outcome_id === hiring.id)?.lane).toBe('later');
      const link = ws.relationships.filter(r => steps.some(t => t.id === r.from_id)); expect(link).toHaveLength(1); expect(link[0]).toMatchObject({ kind: 'blocks', confirmed: false, source: 'ai' });
      expect(ws.captures.find(c => c.id === g[0]!.id)!.status).toBe('organized'); expect(desk.status).toBe('pending');
      const audits = (await d.query('select action from audit_events order by at')).rows.map((r: any) => r.action);
      expect(audits).toEqual(expect.arrayContaining(['folder-delete', 'priority-apply', 'outcome-done', 'idea-promoted']));
    });
  }, 120_000);
});
