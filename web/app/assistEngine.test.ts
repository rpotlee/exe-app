import { describe, expect, it } from 'vitest';
import { AssistEngine, indicator, type HelpClient, type HelpResponse } from './assistEngine';
import { AiRequestError } from './aiRequests';
import { addCaptures } from '../../src/domain/commands';
import { emptyWorkspace } from '../../src/domain/model';
import { applyWrites, type Ctx } from '../../src/domain/writes';

const consent = { enabled: true, disclosure_accepted_at: '2026-11-01T00:00:00Z', provider: 'groq', model: 'm' };
const entry = (id: string, text: string, kind = 'todo') => ({ id, text, kind });
function memory() { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, m }; }
function client(impl?: (ids: string[]) => Promise<HelpResponse>) {
  const calls: { ids: string[]; manual: boolean; want?: string }[] = [];
  const c: HelpClient = {
    settings: async () => consent,
    help: async (ids, opts) => {
      calls.push({ ids, manual: opts.manual, want: opts.want });
      return impl ? impl(ids) : { items: ids.map(id => ({ captureId: id, kind: 'draft' as const, draft: { subject: 's', body: 'Draft' } })), usage: { input: 10, output: 5 } };
    },
  };
  return { c, calls };
}
function setup(impl?: Parameters<typeof client>[0], storage = memory(), owner = 'A') {
  const cl = client(impl), eng = new AssistEngine(cl.c, storage);
  eng.configure(owner, consent);
  return { cl, eng, storage };
}

describe('explicit assistance', () => {
  it('never calls the provider on load, settings refresh, edits, or time passing', async () => {
    const { cl, eng } = setup();
    eng.update(Array.from({ length: 40 }, (_, i) => entry(`i${i}`, `Email Sarah about the job opening number ${i}`)));
    eng.configure('A', consent);
    eng.update([entry('i0', 'Email Tom about the budget review'), entry('q', 'What is the deadline?')]);
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(cl.calls).toHaveLength(0);
    expect(eng.status().diag.requests).toBe(0);
    expect(eng.status().queued).toBe(0);
    expect(indicator(eng.get('i0'))).toBe('Can draft this');
    expect(indicator(eng.get('q'))).toBe('Can answer this');
  });

  it('shows free local offers and skips routine entries', () => {
    const { cl, eng } = setup();
    eng.update([entry('a', 'Research business registration in New York'), entry('b', 'Call the plumber'), entry('c', 'Take out the trash')]);
    expect(indicator(eng.get('a'))).toBe('Research available');
    expect(indicator(eng.get('b'))).toBe('Preparation available');
    expect(indicator(eng.get('c'))).toBeNull();
    expect(cl.calls).toHaveLength(0);
  });

  it('makes one provider call only after Ask Exe, including for a skipped entry', async () => {
    const { cl, eng } = setup();
    eng.update([entry('a', 'Take out the trash')]);
    expect(await eng.ask('a', 'steps')).toBe(true);
    expect(cl.calls).toEqual([{ ids: ['a'], manual: true, want: 'steps' }]);
    expect(eng.get('a')?.source).toBe('manual');
    expect(eng.status().diag.requests).toBe(1);
  });

  it('restores manual help from the account cache without another call', async () => {
    const storage = memory(), first = setup(undefined, storage);
    first.eng.update([entry('a', 'Email Sarah about the job opening')]);
    await first.eng.ask('a', 'draft');
    const again = setup(undefined, storage);
    again.eng.update([entry('a', 'Email   sarah about the job opening')]);
    expect(again.cl.calls).toHaveLength(0);
    expect(again.eng.get('a')?.draft?.body).toBe('Draft');
    expect(again.eng.status().diag.cacheHits).toBeGreaterThan(0);
  });

  it('marks old help stale after an edit and refreshes only on request', async () => {
    const { cl, eng } = setup();
    eng.update([entry('a', 'Email Sarah about the job opening')]);
    await eng.ask('a', 'draft');
    eng.update([entry('a', 'Email Tom about the budget review')]);
    expect(eng.get('a')?.stale).toBe(true);
    expect(cl.calls).toHaveLength(1);
    await eng.ask('a', 'draft');
    expect(cl.calls).toHaveLength(2);
    expect(eng.get('a')?.stale).toBe(false);
  });

  it('keeps cached help private to its account', async () => {
    const storage = memory(), a = setup(undefined, storage, 'A');
    a.eng.update([entry('x', 'Email Sarah about the job opening')]);
    await a.eng.ask('x', 'draft');
    const b = setup(undefined, storage, 'B');
    b.eng.update([entry('x', 'Email Sarah about the job opening')]);
    expect(b.eng.get('x')?.draft).toBeUndefined();
    expect(b.cl.calls).toHaveLength(0);
  });

  it('does not retry a rate limited request automatically', async () => {
    const { cl, eng } = setup(async () => { throw new AiRequestError('cool down', 429, Date.now() + 30_000, 'rate_limited'); });
    eng.update([entry('a', 'Email Sarah about the job opening')]);
    expect(await eng.ask('a', 'draft')).toBe(false);
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(cl.calls).toHaveLength(1);
    expect(eng.status().error).toBe('cool down');
  });

  it('keeps saving and task state independent of AI failure or output', async () => {
    const ws = emptyWorkspace(); let n = 0;
    const ctx: Ctx = { owner: 'A', now: () => new Date(0).toISOString(), id: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}` };
    const added = addCaptures(ws, ctx, 'Email Sarah about the job opening\nCall the plumber', 'List');
    const saved = added.ok ? applyWrites(ws, added.writes) : ws;
    const before = JSON.stringify(saved);
    const { eng } = setup(async ids => ({ items: ids.map(id => ({ captureId: id, kind: 'draft' as const, draft: { subject: '', body: 'x' }, completed: true, delete: true } as never)) }));
    eng.update(saved.captures.map(c => entry(c.id, c.text)));
    await eng.ask(saved.captures[0]!.id, 'draft');
    expect(JSON.stringify(saved)).toBe(before);
  });

  it('requires AI to be enabled with disclosure accepted', async () => {
    const cl = client(), eng = new AssistEngine(cl.c, memory());
    eng.configure('A', { ...consent, disclosure_accepted_at: null });
    eng.update([entry('a', 'Email Sarah about the job opening')]);
    expect(await eng.ask('a', 'draft')).toBe(false);
    expect(cl.calls).toHaveLength(0);
  });
});
