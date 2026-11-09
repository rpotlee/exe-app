import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../../src/store/supabase';
import { AiRequestCoordinator, AiRequestError, aiRequests, invokeAi, onAiSettingsChanged } from './aiRequests';
import { makeAi } from './ai';
import { cachedState, cacheState, makeAssistantApi } from './assistantApi';
import { emptyState } from '../../src/domain/assistant';

type Reply = { data: unknown; error: { context: Response } | null };
const ok = (data: unknown = { state: {}, prepared: true }): Reply => ({ data, error: null });
const limited = (seconds: number): Reply => ({ data: null, error: { context: new Response(JSON.stringify({ error: 'Cooling down', retryAfterSeconds: seconds }), { status: 429, headers: { 'Retry-After': String(seconds) } }) } });
function client() {
  const invoke = vi.fn(async (_fn: string, _opts: { body: Record<string, unknown> }): Promise<Reply> => ok());
  return { db: { functions: { invoke }, from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }) } as unknown as Db, invoke };
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('AI request coordination', () => {
  it('creating both clients makes zero requests', () => {
    const { db, invoke } = client(); makeAi(db, 'alice'); makeAssistantApi(db, 'alice');
    expect(invoke).not.toHaveBeenCalled();
  });
  it('notifies only the affected owner after successful settings changes', async () => {
    const { db, invoke } = client(), alice = vi.fn(), bob = vi.fn();
    const offAlice = onAiSettingsChanged('alice', alice), offBob = onAiSettingsChanged('bob', bob);
    try {
      const ai = makeAi(db, 'alice');
      await ai.saveKey('groq', 'test-model', 'test-only-key'); await ai.accept(); await ai.turnOff(); await ai.removeKey();
      expect(alice).toHaveBeenCalledTimes(4); expect(alice.mock.calls.every(args => args.length === 0)).toBe(true); expect(bob).not.toHaveBeenCalled();
      invoke.mockResolvedValueOnce({ data: null, error: { context: new Response('null', { status: 500 }) } });
      await expect(ai.removeKey()).rejects.toBeInstanceOf(AiRequestError); expect(alice).toHaveBeenCalledTimes(4);
    } finally { offAlice(); offBob(); }
  });
  it('shares a lane only for the same db and owner', () => {
    const { db } = client(); expect(aiRequests(db, 'alice')).toBe(aiRequests(db, 'alice'));
    expect(aiRequests(db, 'alice')).not.toBe(aiRequests(db, 'bob'));
    expect(aiRequests(db, 'alice')).not.toBe(aiRequests(client().db, 'alice'));
  });
  it('single-flights concurrent identical operations and serializes other generation', async () => {
    const lane = new AiRequestCoordinator(), gate = deferred<string>();
    const one = vi.fn(() => gate.promise), two = vi.fn(async () => 'two');
    const a = lane.run('one', one), duplicate = lane.run('one', one), b = lane.run('two', two);
    expect(a).toBe(duplicate); await Promise.resolve(); expect(one).toHaveBeenCalledTimes(1); expect(two).not.toHaveBeenCalled();
    gate.resolve('one'); expect(await a).toBe('one'); expect(await b).toBe('two'); expect(two).toHaveBeenCalledTimes(1);
  });
  it('bounds the pending generation queue', async () => {
    const lane = new AiRequestCoordinator(), gate = deferred<string>();
    const pending = Array.from({ length: 5 }, (_, i) => lane.run(`request-${i}`, () => gate.promise));
    await expect(lane.run('overflow', async () => '')).rejects.toMatchObject({ code: 'busy' });
    gate.resolve('done'); await Promise.all(pending);
  });
  it('a 429 pauses queued and later work across assistant and review, but allows restore-only reads', async () => {
    const { db, invoke } = client(); invoke.mockResolvedValueOnce(limited(30));
    const ai = makeAi(db, 'alice'), assistant = makeAssistantApi(db, 'alice');
    const first = ai.assist(['id']), queued = assistant.prepare('id', 'draft');
    await expect(first).rejects.toMatchObject({ status: 429, retryAfterSeconds: 30 });
    await expect(queued).rejects.toMatchObject({ code: 'rate_limited' });
    await expect(ai.test()).rejects.toMatchObject({ code: 'rate_limited' });
    expect(invoke).toHaveBeenCalledTimes(1);
    await assistant.load('id', 'draft'); expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke.mock.calls[1]?.[1].body.op).toBe('restore');
  });
  it('honors Retry-After and resumes only on a new explicit call after cooldown', async () => {
    const { db, invoke } = client(); vi.spyOn(Date, 'now').mockReturnValue(1_000);
    invoke.mockResolvedValueOnce(limited(1)); const lane = aiRequests(db, 'alice');
    await expect(lane.run('one', () => invokeAi(db, 'ai-review', {}))).rejects.toBeInstanceOf(AiRequestError);
    expect(invoke).toHaveBeenCalledTimes(1); vi.mocked(Date.now).mockReturnValue(2_001);
    expect(invoke).toHaveBeenCalledTimes(1);
    await lane.run('two', () => invokeAi(db, 'ai-review', {})); expect(invoke).toHaveBeenCalledTimes(2);
  });
  it('keeps one assistant operation id through a lost-response retry and resets after success', async () => {
    const { db, invoke } = client(); invoke.mockRejectedValueOnce(new Error('lost response'));
    const assistant = makeAssistantApi(db, 'alice');
    await expect(assistant.send('id', 'entry', 'Make it shorter')).rejects.toBeInstanceOf(AiRequestError);
    await assistant.send('id', 'entry', 'Make it shorter'); await assistant.send('id', 'entry', 'Make it shorter');
    const ids = invoke.mock.calls.map(call => call[1].body.clientRequestId);
    expect(ids[0]).toEqual(ids[1]); expect(ids[2]).not.toEqual(ids[1]);
  });
  it('deduplicates overlapping restore reads without generating and sends analysis only with explicit intent', async () => {
    const { db, invoke } = client(), gate = deferred<Reply>(); invoke.mockReturnValueOnce(gate.promise);
    const assistant = makeAssistantApi(db, 'alice'), a = assistant.load('id', 'entry'), b = assistant.load('id', 'entry');
    expect(invoke).toHaveBeenCalledTimes(1); gate.resolve(ok()); await Promise.all([a, b]);
    await makeAi(db, 'alice').assist(['id']); expect(invoke.mock.calls[1]?.[1].body).toMatchObject({ mode: 'assist', intent: 'analyze' });
  });
  it('fails safe against an old server without falling back to its generative open operation', async () => {
    const { db, invoke } = client();
    invoke.mockResolvedValueOnce({ data: null, error: { context: new Response(JSON.stringify({ error: 'Bad request.' }), { status: 400 }) } });
    await expect(makeAssistantApi(db, 'alice').load('id', 'entry')).rejects.toMatchObject({ status: 400 });
    expect(invoke).toHaveBeenCalledTimes(1); expect(invoke.mock.calls[0]?.[1].body.op).toBe('restore');
  });
  it('only restores locally cached help for the same owner and unchanged entry text', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
    const state = emptyState(false); cacheState('id', state, 'original words', 'alice');
    expect(cachedState('id', 'original words', 'alice')).toEqual(state);
    expect(cachedState('id', 'edited words', 'alice')).toBeNull();
    expect(cachedState('id', 'original words', 'bob')).toBeNull();
    expect(cachedState('id')).toBeNull();
    values.set('exe-assistant-state:legacy-id', JSON.stringify(state));
    expect(cachedState('legacy-id', 'words', 'alice')).toBeNull();
  });
  it('rejects malformed successful replies rather than treating them as completed cached work', async () => {
    const { db, invoke } = client(); invoke.mockResolvedValueOnce(ok({ prepared: true }));
    const assistant = makeAssistantApi(db, 'alice');
    await expect(assistant.prepare('id', 'words')).rejects.toBeInstanceOf(AiRequestError);
    await assistant.prepare('id', 'words');
    expect(invoke.mock.calls[0]?.[1].body.clientRequestId).toEqual(invoke.mock.calls[1]?.[1].body.clientRequestId);
  });
  it('a late restore cannot overwrite a newer explicitly prepared result in the device cache', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
    const { db, invoke } = client(), read = deferred<Reply>();
    invoke.mockReturnValueOnce(read.promise).mockResolvedValueOnce(ok({ state: { note: 'New result' }, prepared: true }));
    const assistant = makeAssistantApi(db, 'alice'), old = assistant.load('id', 'entry');
    await assistant.prepare('id', 'entry'); read.resolve(ok({ state: { note: 'Old result' }, prepared: true })); await old;
    expect(cachedState('id', 'entry', 'alice')?.note).toBe('New result');
  });
  it('handles null gateway error JSON as an unavailable error', async () => {
    const { db, invoke } = client(); invoke.mockResolvedValueOnce({ data: null, error: { context: new Response('null', { status: 502 }) } });
    await expect(invokeAi(db, 'assistant', {})).rejects.toMatchObject({ status: 502, code: 'unavailable' });
  });
});
