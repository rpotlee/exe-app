// Imports run against memory AND the real schema: the prototype's own example export, this app's backup, and hostile files.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { importWrites, parseBackup } from './backup';
import { emptyWorkspace, type Workspace } from './model';
import { applyWrites, type Ctx } from './writes';
import { asUser, freshDb, A } from '../../supabase/tests/harness.mjs';

let n = 1000;
const ctx: Ctx = { owner: A, now: () => '2027-03-01T00:00:00.000Z', id: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}` };
const proto = readFileSync(new URL('../../docs/baseline-example.json', import.meta.url), 'utf8');
const ok = (t: string) => { const r = parseBackup(t, ctx.now()); if (!r.ok) throw new Error(r.error); return r.parsed; };

describe('parseBackup', () => {
  it('reads the prototype example: nothing lost, rules respected', () => {
    const p = ok(proto);
    expect(p.kind).toBe('prototype');
    expect(p.counts).toMatchObject({ folders: 5, outcomes: 12, steps: 23, captures: 18, decisions: 5, ideas: 2 });
    expect(p.ws.focus.filter(f => f.lane === 'now')).toHaveLength(3);
    expect(p.ws.captures.map(c => c.text)[0]).toMatch(/optimize Altr/);          // original wording kept
    expect(p.ws.relationships.length).toBeGreaterThanOrEqual(5);                   // relationships (including old blockedBy ones) kept
    expect(p.ws.tasks.every(t => t.done_at === null)).toBe(true);                 // no invented progress
  });
  it('refuses files that are not backups, too large, or not JSON', () => {
    expect(parseBackup('{not json')).toMatchObject({ ok: false });
    expect(parseBackup('[1,2]')).toMatchObject({ ok: false });
    expect(parseBackup('{"hello":1}')).toMatchObject({ ok: false });
    expect(parseBackup('x'.repeat(8_000_001))).toMatchObject({ ok: false });
  });
  it('limits the active priorities even if the file has more than three', () => {
    const d = JSON.parse(proto); d.focusAssignments = d.outcomes.map((o: { id: string }) => ({ outcome: o.id, lane: 'now' }));
    const p = ok(JSON.stringify(d)); expect(p.ws.focus.filter(f => f.lane === 'now')).toHaveLength(3); expect(p.warnings.join(' ')).toMatch(/three/);
  });
});

describe('importWrites against the real schema', () => {
  it('imports the prototype, adds again, replaces, and round-trips this app\'s own backup', async () => {
    const db = await freshDb();
    await asUser(db, A, async (d: any) => {
      let ws: Workspace = emptyWorkspace();
      const run = async (writes: ReturnType<typeof importWrites>['writes']) => { await d.query('select exe_apply_writes($1::jsonb)', [JSON.stringify(writes)]); ws = applyWrites(ws, writes); };
      const count = async (t: string) => (await d.query(`select count(*)::int n from ${t}`)).rows[0].n;

      await run(importWrites(ws, ctx, ok(proto).ws, 'add').writes);
      expect([await count('folders'), await count('outcomes'), await count('tasks'), await count('captures'), await count('decisions'), await count('ideas')]).toEqual([5, 12, 23, 18, 5, 2]);
      expect(await count('relationships')).toBeGreaterThanOrEqual(5);
      expect((await d.query(`select count(*)::int n from focus_assignments where lane='now'`)).rows[0].n).toBe(3);
      expect(ws.captures.every(c => c.owner_id === A)).toBe(true);
      const names = (await d.query(`select text from captures order by text`)).rows.map((r: any) => r.text);
      expect(names).toContain('Register the business in NYC');

      // adding a second copy never exceeds three Now and never reuses ids
      await run(importWrites(ws, ctx, ok(proto).ws, 'add').writes);
      expect(await count('captures')).toBe(36); expect((await d.query(`select count(*)::int n from focus_assignments where lane='now'`)).rows[0].n).toBe(3);

      // replace leaves exactly one copy; the current focus is handled without a stale write
      expect(ws.settings?.current_focus_outcome_id).toBeTruthy();   // the prototype's current priority carried over (it is a Now outcome)
      await run(importWrites(ws, ctx, ok(proto).ws, 'replace').writes);
      expect([await count('folders'), await count('outcomes'), await count('captures')]).toEqual([5, 12, 18]);

      // this app's own backup comes back the same
      const backup = JSON.stringify(ws);
      const again = ok(backup); expect(again.kind).toBe('exe');
      await run(importWrites(ws, ctx, again.ws, 'replace').writes);
      expect([await count('outcomes'), await count('tasks'), await count('captures'), await count('relationships')]).toEqual([12, 23, 18, again.counts.relationships]);
    });
  }, 120_000);

  it('drops unexpected columns, forces the current owner, and never trusts the file\'s ids', () => {
    const d = JSON.parse(proto);
    const hostile = { ...ok(JSON.stringify({ folders: [{ id: 'x', owner_id: 'someone-else', name: 'F', evil: 'DROP TABLE', description: '', icon: 'folder', position: 0, created_at: 'x', updated_at: 'x', revision: 99 }], outcomes: [], focus: [] })).ws };
    const w = importWrites(emptyWorkspace(), ctx, hostile, 'add').writes[0]!;
    expect(w.row).not.toHaveProperty('evil'); expect(w.row.owner_id).toBe(A); expect(w.row.revision).toBe(1); expect(w.row.id).not.toBe('x'); expect(w.row.created_at).toBe(ctx.now());
    void d;
  });
});
