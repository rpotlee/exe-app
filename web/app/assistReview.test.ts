import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssistReview, type AssistClient, type ReviewEntry } from './assistReview';
import type { Assist } from './ai';
const config = { enabled: true, disclosure_accepted_at: '2026-11-09', provider: 'groq', model: 'chosen-model' };
const answer: Assist = { items: [], priorities: [], groups: [], dependencies: [] };
const entries = (n: number): ReviewEntry[] => Array.from({ length: n }, (_, i) => ({ id: `c${i}`, text: `Prepare task ${i}`, kind: 'todo' }));
const storage = () => { const map = new Map<string,string>(); return { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key,value); } }; };
function setup(n = 300) { const assist = vi.fn<AssistClient['assist']>().mockResolvedValue(answer), saved = storage(); const ai = { settings: async () => config, assist }; const review = new AssistReview(ai, saved); review.configure('owner',config); review.update(entries(n)); return { review, assist, saved, ai }; }
afterEach(() => vi.useRealTimers());
describe('explicit AI review', () => {
  it('opening, restoring, importing 300 entries and waiting never generates', async () => {
    vi.useFakeTimers(); const { review, assist } = setup();
    await vi.advanceTimersByTimeAsync(120_000); expect(review.view().pendingCount).toBe(300); expect(assist).not.toHaveBeenCalled();
  });
  it('one click processes exactly four and stops; cached no-help results are reused after reload', async () => {
    const { review, assist, ai, saved } = setup(); await review.run();
    expect(assist).toHaveBeenCalledTimes(1); expect(assist.mock.calls[0]?.[0]).toEqual(['c0','c1','c2','c3']); expect(review.view().pendingCount).toBe(296);
    const reload = new AssistReview(ai,saved); reload.configure('owner',config); reload.update(entries(300));
    expect(reload.view().pendingCount).toBe(296); expect(assist).toHaveBeenCalledTimes(1);
    await reload.run(); expect(assist.mock.calls[1]?.[0]).toEqual(['c4','c5','c6','c7']);
  });
  it('double-clicks while a batch is in flight do not create more calls', async () => {
    const { review, assist } = setup(); let finish!: (value: Assist) => void;
    assist.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const first = review.run(); await review.run(); expect(assist).toHaveBeenCalledTimes(1); finish(answer); await first;
  });
  it('a rate limit leaves every entry pending and never advances or automatically retries', async () => {
    vi.useFakeTimers(); const { review, assist } = setup();
    assist.mockRejectedValue(Object.assign(new Error('Cooling down'), { retryAt: Date.now()+60_000 }));
    await review.run(); expect(review.view().pendingCount).toBe(300); await review.run(); expect(assist).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(120_000); expect(assist).toHaveBeenCalledTimes(1);
    assist.mockResolvedValue(answer); await review.run(); expect(assist.mock.calls[1]?.[0]).toEqual(['c0','c1','c2','c3']);
  });
  it('does not treat a network failure as successful analysis', async () => {
    const { review, assist } = setup(); assist.mockRejectedValueOnce(new Error('offline')); await review.run();
    expect(review.view().pendingCount).toBe(300); await review.run(); expect(review.view().pendingCount).toBe(296);
  });
  it('invalidates changed text or kind, but metadata-only changes do not request work', async () => {
    const { review, assist } = setup(4); assist.mockResolvedValue({ ...answer, priorities: [{ captureId:'c0',level:'high',why:'Explicit deadline' }] }); await review.run();
    expect(review.view().prios.c0?.level).toBe('high'); review.update(entries(4)); expect(review.view().pendingCount).toBe(0);
    const changed=entries(4); changed[0]!.text='A completely different task'; changed[1]!.kind='note'; review.update(changed);
    expect(review.view().pendingCount).toBe(2); expect(review.view().prios.c0).toBeUndefined(); expect(assist).toHaveBeenCalledTimes(1);
  });
  it('does not reuse another owner or model cache', async () => {
    const { review, ai, saved } = setup(4); await review.run();
    const other = new AssistReview(ai,saved); other.configure('other',config); other.update(entries(4)); expect(other.view().pendingCount).toBe(4);
    other.configure('owner',{...config,model:'different'}); expect(other.view().pendingCount).toBe(4);
  });
  it('disabled AI never generates even when explicitly requested', async () => {
    const { review, assist } = setup(); review.configure('owner',{...config,enabled:false}); await review.run(); expect(assist).not.toHaveBeenCalled();
  });
  it('shrinks batches for long multilingual input instead of retrying an oversized batch', async () => {
    const { review, assist } = setup(4); review.update(entries(4).map(e => ({ ...e, text: '界'.repeat(1000) })));
    expect(review.view().batchSize).toBe(1); await review.run(); expect(assist.mock.calls[0]?.[0]).toHaveLength(1);
  });
  it('does not save results into a different model cache when settings change in flight', async () => {
    const { review, assist, ai, saved } = setup(4); let finish!: (r: Assist) => void;
    assist.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const work=review.run(); review.configure('owner',{...config,model:'new-model'}); finish(answer); expect(await work).toBeNull();
    const reload=new AssistReview(ai,saved); reload.configure('owner',{...config,model:'new-model'}); reload.update(entries(4)); expect(reload.view().pendingCount).toBe(4);
  });
  it('ignores corrupt device caches without crashing or requesting AI', () => {
    const assist=vi.fn<AssistClient['assist']>().mockResolvedValue(answer);
    const review=new AssistReview({settings:async()=>config,assist},{getItem:()=>'{"seen":null,"groups":null}',setItem:()=>{}});
    review.configure('owner',config); review.update(entries(300)); expect(review.view().pendingCount).toBe(300); expect(assist).not.toHaveBeenCalled();
  });
});
