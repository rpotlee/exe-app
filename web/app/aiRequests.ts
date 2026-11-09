import type { Db } from '../../src/store/supabase';
import { uuid } from '../../src/domain/uuid';

const settingsEvents = new EventTarget();
/** Refresh only this owner's settings metadata after a successful settings mutation. No credentials enter this event. */
export function notifyAiSettingsChanged(uid: string): void { settingsEvents.dispatchEvent(new CustomEvent('change', { detail: uid })); }
export function onAiSettingsChanged(uid: string, listener: () => void): () => void {
  const onChange = (event: Event) => { if ((event as CustomEvent<string>).detail === uid) listener(); };
  settingsEvents.addEventListener('change', onChange);
  return () => settingsEvents.removeEventListener('change', onChange);
}

export class AiRequestError extends Error {
  constructor(message: string, readonly status = 0, readonly retryAt: number | null = null, readonly code: 'rate_limited' | 'busy' | 'unavailable' = 'unavailable') { super(message); this.name = 'AiRequestError'; }
  get retryAfterSeconds(): number { return this.retryAt ? Math.max(0, Math.ceil((this.retryAt - Date.now()) / 1000)) : 0; }
}

const DEFAULT_COOLDOWN_SECONDS = 60;
function retrySeconds(value: string | null): number {
  if (!value) return 0;
  const seconds = Number(value);
  return Number.isFinite(seconds) ? Math.max(0, seconds) : Math.max(0, (Date.parse(value) - Date.now()) / 1000) || 0;
}

/** Only server-authored error messages are shown; provider response bodies never reach this client. */
export async function invokeAi<T>(db: Db, fn: string, body: Record<string, unknown>): Promise<T> {
  let result;
  try { result = await db.functions.invoke(fn, { body }); }
  catch { throw new AiRequestError('Could not reach AI. Your work is safe. Try again when connected.'); }
  if (!result.error) return result.data as T;
  const response = (result.error as { context?: Response }).context;
  let info: { error?: unknown; status?: unknown; retryAfterSeconds?: unknown } = {};
  if (response && typeof response.json === 'function') { try { const parsed = await response.clone().json(); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) info = parsed; } catch { /* a gateway can return non-JSON */ } }
  const status = info.status === 429 || response?.status === 429 ? 429 : response?.status ?? 0;
  if (status === 429) {
    const seconds = Math.max(typeof info.retryAfterSeconds === 'number' && Number.isFinite(info.retryAfterSeconds) ? info.retryAfterSeconds : 0, retrySeconds(response?.headers.get('Retry-After') ?? null));
    const wait = seconds > 0 ? seconds : DEFAULT_COOLDOWN_SECONDS;
    throw new AiRequestError('AI is cooling down. Your work is safe; try again after the wait.', 429, Date.now() + wait * 1000, 'rate_limited');
  }
  throw new AiRequestError(typeof info.error === 'string' ? info.error : 'The assistant is unavailable. Your work is safe; try again later.', status);
}

/** One bounded lane for all AI generation by this signed-in owner. No timers or automatic retries. */
export class AiRequestCoordinator {
  private tail: Promise<unknown> = Promise.resolve();
  private pending = new Map<string, Promise<unknown>>();
  private count = 0;
  private cooldownUntil = 0;
  private retryIds = new Map<string, string>();

  operationId(key: string): string {
    const previous = this.retryIds.get(key); if (previous) return previous;
    while (this.retryIds.size >= 32) this.retryIds.delete(this.retryIds.keys().next().value!);
    const id = uuid(); this.retryIds.set(key, id); return id;
  }
  completeOperation(key: string): void { this.retryIds.delete(key); }

  run<T>(key: string, execute: () => Promise<T>, generate = true): Promise<T> {
    const same = this.pending.get(key); if (same) return same as Promise<T>;
    const cooldown = () => new AiRequestError('AI is cooling down. Your work is safe; try again after the wait.', 429, this.cooldownUntil, 'rate_limited');
    if (generate && this.cooldownUntil > Date.now()) return Promise.reject(cooldown());
    if (generate && this.count >= 5) return Promise.reject(new AiRequestError('AI is already helping with several requests. Wait for one to finish before asking again.', 409, null, 'busy'));
    if (generate) this.count++;
    const start = async () => {
      if (generate && this.cooldownUntil > Date.now()) throw cooldown();
      try { return await execute(); }
      catch (error) { if (error instanceof AiRequestError && error.retryAt) this.cooldownUntil = Math.max(this.cooldownUntil, error.retryAt); throw error; }
    };
    const work = (generate ? this.tail.then(start) : start()).finally(() => { this.pending.delete(key); if (generate) this.count--; });
    this.pending.set(key, work);
    if (generate) this.tail = work.catch(() => undefined);
    return work;
  }
}

const owners = new WeakMap<Db, Map<string, AiRequestCoordinator>>();
export function aiRequests(db: Db, uid: string): AiRequestCoordinator {
  let byOwner = owners.get(db); if (!byOwner) { byOwner = new Map(); owners.set(db, byOwner); }
  let lane = byOwner.get(uid); if (!lane) { lane = new AiRequestCoordinator(); byOwner.set(uid, lane); }
  return lane;
}
