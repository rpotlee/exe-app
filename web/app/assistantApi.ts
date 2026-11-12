import { emptyState, type AssistantState } from '../../src/domain/assistant';
import { AiRequestError, aiRequests, invokeAi } from './aiRequests';
import type { Db } from '../../src/store/supabase';
import { choose, doAction, evaluate, send } from './demoAssistant';

/** One way for the assistant screens to talk to "an assistant": the labeled demo (this device) or the real service (the person's own AI, saved to their account). */
export interface Adapter {
  demo: boolean;
  load(id: string, text: string): Promise<{ state: AssistantState; stale: boolean; prepared?: boolean }>;
  prepare(id: string, text: string): Promise<AssistantState>;
  send(id: string, text: string, typed: string): Promise<AssistantState>;
  choose(id: string, text: string, choiceId: string): Promise<AssistantState>;
  act(id: string, text: string, actionId: string): Promise<AssistantState>;
}

const KEY = (id: string, uid: string) => `exe-assistant-state:v2:${uid}:${id}`;
/** A device copy of the last state the server gave, so list rows can show their quiet mark without asking the server about every entry. */
export function cachedState(id: string, text?: string, uid?: string): AssistantState | null {
  if (text === undefined || !uid) return null; // old unscoped results cannot establish identity
  try { const raw = localStorage.getItem(KEY(id, uid)); if (!raw) return null; const saved = JSON.parse(raw) as { text?: string; state?: AssistantState }; return saved.text === text && saved.state && typeof saved.state === 'object' && !Array.isArray(saved.state) ? saved.state : null; } catch { return null; }
}
export function cacheState(id: string, s: AssistantState, text?: string, uid?: string): void {
  if (text === undefined || !uid) return;
  try { localStorage.setItem(KEY(id, uid), JSON.stringify({ text, state: s })); } catch { /* best effort */ }
}

const DKEY = (id: string) => `exe-assistant-demo:${id}`;
export const demoAdapter: Adapter = {
  demo: true,
  async load(id, text) { try { const raw = localStorage.getItem(DKEY(id)); if (raw) { const j = JSON.parse(raw) as { text: string; state: AssistantState }; if (j.text === text) return { state: j.state, stale: false, prepared: true }; } } catch { /* fresh */ } return { state: emptyState(true), stale: false, prepared: false }; },
  async prepare(id, text) { const state = evaluate(text); demoSave(id, text, state); return state; },
  async send(id, text, typed) { const n = send(await demoState(id, text), text, typed); demoSave(id, text, n); return n; },
  async choose(id, text, choiceId) { const n = choose(await demoState(id, text), text, choiceId); demoSave(id, text, n); return n; },
  async act(id, text, actionId) { const n = doAction(await demoState(id, text), text, actionId); demoSave(id, text, n); return n; },
};
const demoState = async (id: string, text: string) => (await demoAdapter.load(id, text)).state;
export function demoSave(id: string, text: string, state: AssistantState): void { try { localStorage.setItem(DKEY(id), JSON.stringify({ text, state })); } catch { /* best effort */ } }

/** The real assistant (the `assistant` server function). The browser never sees the key; every call carries a request id so a retry never repeats work. */
export function makeAssistantApi(db: Db, uid: string): Adapter {
  const lane = aiRequests(db, uid);
  let cacheEpoch = 0, mutations = 0;
  function call(op: string, captureId: string, extra: Record<string, unknown> = {}, entryText = ''): Promise<{ state: AssistantState; stale: boolean; prepared?: boolean }> {
    const key = `assistant:${JSON.stringify({ op, captureId, entryText, ...extra })}`;
    return lane.run(key, async () => {
      const restoreEpoch = cacheEpoch, generates = op !== 'open' && op !== 'restore';
      if (generates) { mutations++; cacheEpoch++; }
      try {
        const d = await invokeAi<{ state: Partial<AssistantState>; stale?: boolean; prepared?: boolean }>(db, 'assistant', { op, captureId, clientRequestId: lane.operationId(key), ...extra });
        if (!d || !d.state || typeof d.state !== 'object' || Array.isArray(d.state)) throw new AiRequestError('AI returned an incomplete result. Your work is safe; try again.');
        lane.completeOperation(key);
        const state = { ...emptyState(false), ...d.state, demo: false } as AssistantState;
        // A late restore must not replace help produced by a newer explicit action.
        if (generates || (restoreEpoch === cacheEpoch && mutations === 0)) {
          if (!d.stale && d.prepared !== false) cacheState(captureId, state, entryText, uid);
          else { try { localStorage.removeItem(KEY(captureId, uid)); } catch { /* best effort */ } }
        }
        return { state, stale: !!d.stale, prepared: d.prepared };
      } finally { if (generates) { mutations--; cacheEpoch++; } }
    }, op !== 'open' && op !== 'restore');
  }
  return {
    demo: false,
    load: (id, text) => call('restore', id, {}, text),
    prepare: async (id, text) => (await call('prepare', id, {}, text)).state,
    send: async (id, text, typed) => (await call('send', id, { text: typed }, text)).state,
    choose: async (id, text, choiceId) => (await call('choose', id, { choiceId }, text)).state,
    act: async (id, text, actionId) => (await call('act', id, { actionId }, text)).state,
  };
}
