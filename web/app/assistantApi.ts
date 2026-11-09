import { emptyState, type AssistantState } from '../../src/domain/assistant';
import { uuid as newId } from '../../src/domain/uuid';
import type { Db } from '../../src/store/supabase';
import { choose, doAction, evaluate, send } from './demoAssistant';

/** One way for the assistant screens to talk to "an assistant": the labeled demo (this device) or the real service (the person's own AI, saved to their account). */
export interface Adapter {
  demo: boolean;
  load(id: string, text: string): Promise<{ state: AssistantState; stale: boolean }>;
  send(id: string, text: string, typed: string): Promise<AssistantState>;
  choose(id: string, text: string, choiceId: string): Promise<AssistantState>;
  act(id: string, text: string, actionId: string): Promise<AssistantState>;
}

const KEY = (id: string) => `exe-assistant-state:${id}`;
/** A device copy of the last state the server gave, so list rows can show their quiet mark without asking the server about every entry. */
export function cachedState(id: string): AssistantState | null { try { const raw = localStorage.getItem(KEY(id)); return raw ? (JSON.parse(raw) as AssistantState) : null; } catch { return null; } }
export function cacheState(id: string, s: AssistantState): void { try { localStorage.setItem(KEY(id), JSON.stringify(s)); } catch { /* best effort */ } }

const DKEY = (id: string) => `exe-assistant-demo:${id}`;
export const demoAdapter: Adapter = {
  demo: true,
  async load(id, text) { try { const raw = localStorage.getItem(DKEY(id)); if (raw) { const j = JSON.parse(raw) as { text: string; state: AssistantState }; if (j.text === text) return { state: j.state, stale: false }; } } catch { /* fresh */ } return { state: evaluate(text), stale: false }; },
  async send(id, text, typed) { const n = send(await demoState(id, text), text, typed); demoSave(id, text, n); return n; },
  async choose(id, text, choiceId) { const n = choose(await demoState(id, text), text, choiceId); demoSave(id, text, n); return n; },
  async act(id, text, actionId) { const n = doAction(await demoState(id, text), text, actionId); demoSave(id, text, n); return n; },
};
const demoState = async (id: string, text: string) => (await demoAdapter.load(id, text)).state;
export function demoSave(id: string, text: string, state: AssistantState): void { try { localStorage.setItem(DKEY(id), JSON.stringify({ text, state })); } catch { /* best effort */ } }

/** The real assistant (the `assistant` server function). The browser never sees the key; every call carries a request id so a retry never repeats work. */
export function makeAssistantApi(db: Db): Adapter {
  async function call(op: string, captureId: string, extra: Record<string, unknown> = {}): Promise<{ state: AssistantState; stale: boolean }> {
    const { data, error } = await db.functions.invoke('assistant', { body: { op, captureId, clientRequestId: newId(), ...extra } });
    if (!error) { const d = data as { state: Partial<AssistantState>; stale?: boolean }; const state = { ...emptyState(false), ...d.state, demo: false } as AssistantState; cacheState(captureId, state); return { state, stale: !!d.stale }; }
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') { try { const j = (await ctx.json()) as { error?: string }; if (j.error) throw new Error(j.error); } catch (e) { if (e instanceof Error && e.message !== 'Unexpected end of JSON input') throw e; } }
    throw new Error('The assistant is not available right now. Your task is safe; try again in a moment.');
  }
  return {
    demo: false,
    load: (id) => call('open', id),
    send: async (id, _t, typed) => (await call('send', id, { text: typed })).state,
    choose: async (id, _t, choiceId) => (await call('choose', id, { choiceId })).state,
    act: async (id, _t, actionId) => (await call('act', id, { actionId })).state,
  };
}
