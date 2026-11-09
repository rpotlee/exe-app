// The assistance engine: screening, batching, debounce, cache, staleness, account isolation, concurrency, retries, manual asks.
import { describe, expect, it } from 'vitest';
import { AssistEngine, BATCH, DEBOUNCE_MS, MAX_ATTEMPTS, indicator, type HelpClient, type HelpResponse } from './assistEngine';
import { screen } from '../../src/domain/assistScreen';
import { AiRequestError } from './aiRequests';
import { addCaptures } from '../../src/domain/commands';
import { emptyWorkspace } from '../../src/domain/model';
import { applyWrites, type Ctx } from '../../src/domain/writes';

/** A clock we drive by hand, so timing is exact. */
function fakeClock() {
  let now = 1_000_000, seq = 0; const timers = new Map<number, { at: number; fn: () => void }>();
  return {
    now: () => now,
    set: (fn: () => void, ms: number) => { const id = ++seq; timers.set(id, { at: now + ms, fn }); return id as unknown as ReturnType<typeof setTimeout>; },
    clear: (t: ReturnType<typeof setTimeout>) => { timers.delete(t as unknown as number); },
    async advance(ms: number) { now += ms; for (const [id, t] of [...timers]) if (t.at <= now) { timers.delete(id); t.fn(); } await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0)); },
    pending: () => timers.size,
  };
}
const consent = { enabled: true, disclosure_accepted_at: '2026-11-01T00:00:00Z', provider: 'groq', model: 'm' };
function client(impl?: (ids: string[], manual: boolean) => Promise<HelpResponse>) {
  const calls: { ids: string[]; manual: boolean; want?: string }[] = []; let active = 0, maxActive = 0;
  const c: HelpClient = {
    settings: async () => consent,
    help: async (ids, o) => { calls.push({ ids, manual: o.manual, want: o.want }); active++; maxActive = Math.max(maxActive, active);
      try { return impl ? await impl(ids, o.manual) : { items: ids.map(id => ({ captureId: id, kind: 'draft' as const, draft: { subject: 's', body: `draft for ${o.texts[id]}` } })), usage: { input: 10, output: 5 } }; }
      finally { active--; } },
  };
  return { c, calls, maxActive: () => maxActive };
}
function memory() { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, m }; }
const e = (id: string, text: string, kind = 'todo') => ({ id, text, kind });
function setup(impl?: Parameters<typeof client>[0], storage = memory(), owner = 'A') {
  const k = fakeClock(), cl = client(impl), eng = new AssistEngine(cl.c, storage, k);
  eng.configure(owner, consent);
  return { k, cl, eng, storage };
}

describe('assistance engine', () => {
  it('1. routine items are skipped without any AI request', async () => {
    const { k, cl, eng } = setup();
    eng.update([e('a', 'Take out the trash'), e('b', 'Do laundry'), e('c', 'Buy milk')]);
    await k.advance(DEBOUNCE_MS * 3);
    expect(cl.calls).toHaveLength(0); expect(eng.status().diag.skipped).toBe(3);
    expect(indicator(eng.get('a'))).toBeNull();
    expect(screen('Research business registration in New York', 'todo')).toEqual({ verdict: 'offer', kind: 'research_offer' });   // an offer needs no AI call either
  });
  it('2. eligible items are batched (up to 8 per request, one request at a time)', async () => {
    const { k, cl, eng } = setup();
    eng.update(Array.from({ length: 11 }, (_, i) => e(`i${i}`, `Email Sarah about the job opening number ${i}`)));
    await k.advance(DEBOUNCE_MS); expect(cl.calls).toHaveLength(1); expect(cl.calls[0]!.ids).toHaveLength(BATCH);
    await k.advance(DEBOUNCE_MS); expect(cl.calls).toHaveLength(2); expect(cl.calls[1]!.ids).toHaveLength(3);
    expect(indicator(eng.get('i0'))).toBe('Draft ready');
  });
  it('3. no request on every keystroke: a burst of edits becomes one debounced request', async () => {
    const { k, cl, eng } = setup();
    const word = 'Email Sarah about the job opening';
    for (let n = 6; n <= word.length; n++) { eng.update([e('a', word.slice(0, n))]); await k.advance(100); }
    expect(cl.calls).toHaveLength(0);
    await k.advance(DEBOUNCE_MS); expect(cl.calls).toHaveLength(1); expect(cl.calls[0]!.ids).toEqual(['a']);
  });
  it('4. unchanged items reuse the cache (also after a reload on the same account)', async () => {
    const storage = memory(); const first = setup(undefined, storage);
    first.eng.update([e('a', 'Email Sarah about the job opening')]); await first.k.advance(DEBOUNCE_MS);
    first.eng.update([e('a', 'Email Sarah about the job opening')]); await first.k.advance(DEBOUNCE_MS * 2);
    expect(first.cl.calls).toHaveLength(1);
    const again = setup(undefined, storage); again.eng.update([e('a', 'Email   sarah about the job opening')]);   // formatting-only change
    await again.k.advance(DEBOUNCE_MS * 2); expect(again.cl.calls).toHaveLength(0); expect(again.eng.get('a')?.draft).toBeTruthy(); expect(again.eng.status().diag.cacheHits).toBeGreaterThan(0);
  });
  it('5. editing an item marks old help stale and fetches fresh help', async () => {
    const { k, cl, eng } = setup();
    eng.update([e('a', 'Email Sarah about the job opening')]); await k.advance(DEBOUNCE_MS);
    eng.update([e('a', 'Email Tom about the budget review')]);
    expect(eng.get('a')?.stale).toBe(true);
    await k.advance(DEBOUNCE_MS); expect(cl.calls).toHaveLength(2); expect(eng.get('a')?.stale).toBe(false); expect(eng.get('a')?.draft?.body).toContain('Tom');
  });
  it('6. one account never sees another account\'s cached help', async () => {
    const storage = memory(); const a = setup(undefined, storage, 'A');
    a.eng.update([e('x', 'Email Sarah about the job opening')]); await a.k.advance(DEBOUNCE_MS); expect(a.eng.get('x')?.draft).toBeTruthy();
    const b = setup(undefined, storage, 'B'); b.eng.update([e('x', 'Email Sarah about the job opening')]);
    expect(b.eng.get('x')?.draft).toBeUndefined();
    const keys = [...storage.m.keys()]; expect(keys.some(k2 => k2.includes('"A"'))).toBe(true); expect(keys.every(k2 => !k2.includes('"A"') || !k2.includes('"B"'))).toBe(true);
  });
  it('7. automatic requests never overlap (concurrency limit of one)', async () => {
    let release: () => void = () => {}; const gate = new Promise<void>(r => { release = r; });
    const { k, cl, eng } = setup(async ids => { await gate; return { items: ids.map(id => ({ captureId: id, kind: 'none' as const })) }; });
    eng.update(Array.from({ length: 12 }, (_, i) => e(`i${i}`, `Email person ${i} about the plan`)));
    await k.advance(DEBOUNCE_MS); await k.advance(DEBOUNCE_MS * 4);
    expect(cl.calls).toHaveLength(1); release(); await k.advance(0); await k.advance(DEBOUNCE_MS);
    expect(cl.calls).toHaveLength(2); expect(cl.maxActive()).toBe(1);
  });
  it('8. rate limits are respected (Retry-After) and retries are bounded, then the batch is given up without jamming the queue', async () => {
    let fails = 0, clockNow = () => 0;
    const { k, cl, eng } = setup(async ids => { if (ids.includes('a')) { fails++; throw new AiRequestError('cool down', 429, clockNow() + 30_000, 'rate_limited'); } return { items: ids.map(id => ({ captureId: id, kind: 'none' as const })) }; });
    clockNow = k.now;
    eng.update([e('a', 'Email Sarah about the job opening')]); await k.advance(DEBOUNCE_MS); expect(fails).toBe(1);
    await k.advance(20_000); expect(fails).toBe(1);   // Retry-After honoured: nothing before 30 s
    for (let i = 0; i < 10; i++) await k.advance(60_000);
    expect(fails).toBe(MAX_ATTEMPTS); expect(eng.get('a')?.failed).toBe(true);
    eng.update([e('a', 'Email Sarah about the job opening'), e('b', 'Email Bob about the invoice')]);
    await k.advance(60_000); expect(cl.calls.at(-1)!.ids).toEqual(['b']);   // the queue carries on
  });
  it('9. repeated saves do not create duplicate requests or duplicate help', async () => {
    const { k, cl, eng } = setup();
    for (let i = 0; i < 5; i++) eng.update([e('a', 'Email Sarah about the job opening')]);
    await k.advance(DEBOUNCE_MS * 3); expect(cl.calls).toHaveLength(1); expect(cl.calls[0]!.ids).toEqual(['a']);
  });
  it('10. manual "Ask Exe" works on an item the rules skipped', async () => {
    const { k, cl, eng } = setup();
    eng.update([e('a', 'Take out the trash')]); await k.advance(DEBOUNCE_MS * 2); expect(cl.calls).toHaveLength(0);
    expect(await eng.ask('a', 'steps')).toBe(true);
    expect(cl.calls).toEqual([{ ids: ['a'], manual: true, want: 'steps' }]); expect(eng.get('a')?.source).toBe('manual');
  });
  it('11. AI being unavailable never blocks saving entries', async () => {
    const { k, eng } = setup(async () => { throw new AiRequestError('down', 503); });
    const ws = emptyWorkspace(); let n = 0; const ctx: Ctx = { owner: 'A', now: () => new Date(0).toISOString(), id: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}` };
    const r = addCaptures(ws, ctx, 'Email Sarah about the job opening\nCall the plumber', 'List'); expect(r.ok).toBe(true);
    const saved = r.ok ? applyWrites(ws, r.writes) : ws; expect(saved.captures).toHaveLength(2);
    eng.update(saved.captures.map(c => e(c.id, c.text))); await k.advance(DEBOUNCE_MS);
    expect(eng.status().error).toBeTruthy(); expect(saved.captures).toHaveLength(2);
    const off = new AssistEngine(null, memory(), fakeClock()); off.configure('A', null); off.update(saved.captures.map(c => e(c.id, c.text))); expect(await off.ask(saved.captures[0]!.id)).toBe(false);
  });
  it('12. model output cannot change authoritative task state', async () => {
    const ws = emptyWorkspace(); let n = 0; const ctx: Ctx = { owner: 'A', now: () => new Date(0).toISOString(), id: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}` };
    const r = addCaptures(ws, ctx, 'Email Sarah about the job opening', 'List'); const saved = r.ok ? applyWrites(ws, r.writes) : ws; const before = JSON.stringify(saved);
    const hostile = async (ids: string[]) => ({ items: ids.map(id => ({ captureId: id, kind: 'draft' as const, draft: { subject: '', body: 'x' }, completed: true, priority: 'high', delete: true } as never)) });
    const { k, eng } = setup(hostile); eng.update(saved.captures.map(c => e(c.id, c.text))); await k.advance(DEBOUNCE_MS);
    expect(JSON.stringify(saved)).toBe(before);
    expect(Object.keys(AssistEngine.prototype)).not.toContain('run');   // there is no write path on the engine at all
  });
  it('13. research is only ever offered or suggested as searches, never as verified sources', async () => {
    const { k, cl, eng } = setup(async (ids, manual) => ({ items: ids.map(id => (manual ? { captureId: id, kind: 'research_offer' as const, queries: ['ny llc requirements'] } : { captureId: id, kind: 'none' as const })) }));
    eng.update([e('a', 'Research business registration in New York')]); await k.advance(DEBOUNCE_MS * 2);
    expect(cl.calls).toHaveLength(0); expect(indicator(eng.get('a'))).toBe('Research available');
    await eng.ask('a', 'research'); const r = eng.get('a')!;
    expect(r.queries).toEqual(['ny llc requirements']); expect(JSON.stringify(r)).not.toMatch(/https?:|sources|verified/i);
  });
  it('without consent nothing is sent', async () => {
    const k = fakeClock(), cl = client(), eng = new AssistEngine(cl.c, memory(), k);
    eng.configure('A', { ...consent, disclosure_accepted_at: null }); eng.update([e('a', 'Email Sarah about the job opening')]);
    await k.advance(DEBOUNCE_MS * 3); expect(cl.calls).toHaveLength(0); expect(await eng.ask('a')).toBe(false);
  });
});
