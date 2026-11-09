// The large test-data file (docs/test-data/exe-test-data.json, made by scripts/make-test-data.mjs) must import cleanly into the real schema.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { importWrites, parseBackup } from './backup';
import { dueReminders } from './commands';
import { emptyWorkspace, type Workspace } from './model';
import { applyWrites, type Ctx } from './writes';
import { asUser, freshDb, A } from '../../supabase/tests/harness.mjs';

let n = 5000;
const ctx: Ctx = { owner: A, now: () => '2026-11-08T18:00:00.000Z', id: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}` };

describe('large test data', () => {
  it('parses with no warnings and imports into the real schema', async () => {
    const text = readFileSync(new URL('../../docs/test-data/exe-test-data.json', import.meta.url), 'utf8');
    const r = parseBackup(text, ctx.now()); if (!r.ok) throw new Error(r.error);
    expect(r.parsed.warnings).toEqual([]);
    const db = await freshDb();
    await asUser(db, A, async (d: any) => {
      let ws: Workspace = emptyWorkspace();
      const { writes } = importWrites(ws, ctx, r.parsed.ws, 'add');
      await d.query('select exe_apply_writes($1::jsonb)', [JSON.stringify(writes)]); ws = applyWrites(ws, writes);
      const count = async (t: string) => (await d.query(`select count(*)::int n from ${t}`)).rows[0].n;
      expect(await count('captures')).toBe(r.parsed.counts.captures);
      expect(await count('captures')).toBeGreaterThan(3000);
      expect((await d.query(`select count(*)::int n from focus_assignments where lane='now'`)).rows[0].n).toBe(3);
      expect((await d.query(`select count(*)::int n from captures where kind='reminder'`)).rows[0].n).toBeGreaterThan(100);
      expect(dueReminders(ws, Date.parse('2026-11-08T18:00:00Z')).length).toBeGreaterThanOrEqual(9);
      expect(await count('relationships')).toBeGreaterThan(40);
    });
  }, 180_000);
});
