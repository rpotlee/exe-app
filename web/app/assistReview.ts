import type { Assist, AssistItem } from './ai';

export interface AssistClient {
  settings(): Promise<{ enabled: boolean; disclosure_accepted_at: string | null; provider?: string; model?: string } | null>;
  assist(ids: string[], texts: Record<string, string>): Promise<Assist>;
}
export interface ReviewEntry { id: string; text: string; kind: string }
interface Saved { seen: Record<string, string>; items: Record<string, AssistItem>; prios: Record<string, { level: 'high' | 'medium' | 'low'; why: string }>; groups: Assist['groups']; deps: Assist['dependencies']; dismissed: string[] }
const empty = (): Saved => ({ seen: {}, items: {}, prios: {}, groups: [], deps: [], dismissed: [] });
const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
function restore(raw: string): Saved {
  const value: unknown = JSON.parse(raw);
  if (!record(value) || !record(value.seen) || !record(value.items) || !record(value.prios) ||
      !Object.values(value.seen).every(x => typeof x === 'string') ||
      !Object.values(value.items).every(x => record(x) && typeof x.captureId === 'string' && ['email','research','question'].includes(String(x.kind))) ||
      !Object.values(value.prios).every(x => record(x) && ['high','medium','low'].includes(String(x.level)) && typeof x.why === 'string') ||
      !Array.isArray(value.groups) || !value.groups.every(x => record(x) && typeof x.name === 'string' && typeof x.why === 'string' && Array.isArray(x.ids) && x.ids.every(i => typeof i === 'string')) ||
      !Array.isArray(value.deps) || !value.deps.every(x => record(x) && typeof x.before === 'string' && typeof x.after === 'string' && typeof x.why === 'string') ||
      !Array.isArray(value.dismissed) || !value.dismissed.every(x => typeof x === 'string')) return empty();
  return value as unknown as Saved;
}
export const REVIEW_BATCH = 4;
const identity = (e: ReviewEntry) => JSON.stringify([e.kind, e.text]);

/** No timers or automatic work: restoration and edits never call the provider.
 * One explicit run handles one small batch, including negative results, and stops. */
export class AssistReview {
  private saved = empty();
  private entries: ReviewEntry[] = [];
  private key = '';
  private listeners = new Set<() => void>();
  private ready: boolean | null = null;
  private busy = false;
  private error = '';
  private retryAt = 0;
  private version = 0;
  private epoch = 0;
  constructor(private ai: AssistClient | null, private storage?: Pick<Storage, 'getItem' | 'setItem'>) {}
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getVersion = () => this.version;
  private emit() { this.version++; for (const fn of this.listeners) fn(); }
  configure(owner: string, config: Awaited<ReturnType<AssistClient['settings']>>) {
    this.epoch++;
    this.error = ''; this.retryAt = 0;
    this.ready = !!config?.enabled && !!config.disclosure_accepted_at;
    this.key = `exe-assist-v2:${JSON.stringify([owner, config?.provider ?? 'demo', config?.model ?? 'demo'])}`;
    this.saved = empty();
    try { const raw = this.storage?.getItem(this.key); if (raw) this.saved = restore(raw); } catch { this.saved = empty(); }
    this.emit();
  }
  deactivate() { this.epoch++; this.ready = false; }
  update(entries: ReviewEntry[]) {
    if (JSON.stringify(entries) === JSON.stringify(this.entries)) return;
    this.entries = entries; this.emit();
  }
  private pending() { return this.entries.filter(e => this.saved.seen[e.id] !== identity(e)); }
  private batch() {
    const batch: ReviewEntry[] = []; let bytes = 0;
    for (const entry of this.pending()) {
      const cost = new TextEncoder().encode(entry.text.slice(0, 1000)).length + 128;
      if (batch.length && bytes + cost > 4500) break;
      batch.push(entry); bytes += cost; if (batch.length === REVIEW_BATCH) break;
    }
    return batch;
  }
  view() {
    const valid = new Set(this.entries.filter(e => this.saved.seen[e.id] === identity(e)).map(e => e.id));
    const select = <T,>(record: Record<string, T>) => Object.fromEntries(Object.entries(record).filter(([id]) => valid.has(id)));
    return { ready: this.ready, busy: this.busy, error: this.error, retryAt: this.retryAt,
      pendingCount: this.pending().length, batchSize: this.batch().length,
      items: select(this.saved.items), prios: select(this.saved.prios),
      groups: this.saved.groups.filter(g => g.ids.every(i => valid.has(i)) && !this.saved.dismissed.includes(g.ids.slice().sort().join())),
      deps: this.saved.deps.filter(d => valid.has(d.before) && valid.has(d.after)),
      texts: Object.fromEntries(this.entries.map(e => [e.id, e.text])),
    };
  }
  private save() { try { this.storage?.setItem(this.key, JSON.stringify(this.saved)); } catch { /* optional device cache */ } }
  dismiss = (ids: string[]) => { this.saved.dismissed.push(ids.slice().sort().join()); this.save(); this.emit(); };
  run = async (): Promise<Assist | null> => {
    if (!this.ai || !this.ready || this.busy || Date.now() < this.retryAt) return null;
    const batch = this.batch(); if (!batch.length) return null;
    const epoch = this.epoch;
    this.busy = true; this.error = ''; this.emit();
    try {
      const r = await this.ai.assist(batch.map(e => e.id), Object.fromEntries(batch.map(e => [e.id, e.text])));
      if (epoch !== this.epoch) return null; // account/settings changed or the owning view unmounted
      const ids = new Set(batch.map(e => e.id));
      for (const e of batch) { this.saved.seen[e.id] = identity(e); delete this.saved.items[e.id]; delete this.saved.prios[e.id]; }
      for (const item of r.items) if (ids.has(item.captureId)) this.saved.items[item.captureId] = item;
      for (const p of r.priorities ?? []) if (ids.has(p.captureId)) this.saved.prios[p.captureId] = { level: p.level, why: p.why };
      this.saved.groups = [...this.saved.groups.filter(g => !g.ids.some(i => ids.has(i))), ...r.groups.filter(g => g.ids.every(i => ids.has(i)))];
      this.saved.deps = [...this.saved.deps.filter(d => !ids.has(d.before) && !ids.has(d.after)), ...r.dependencies.filter(d => ids.has(d.before) && ids.has(d.after))];
      this.save(); return r;
    } catch (e) {
      if (epoch !== this.epoch) return null;
      this.error = e instanceof Error ? e.message : 'AI help is unavailable.';
      const at = (e as { retryAt?: unknown })?.retryAt;
      this.retryAt = typeof at === 'number' ? at : 0;
      // Failed entries stay pending. There is no automatic continuation or retry after cooldown.
      return null;
    } finally { this.busy = false; this.emit(); }
  };
}
