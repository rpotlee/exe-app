// The assistance engine (Stages A–C): code-first screening, one debounced queue of small batches, and a per-account cache.
// It only ever produces SUGGESTIONS kept on this device. It has no write path to the workspace: it cannot create, move,
// complete, reprioritize or send anything. Saving entries never waits for it.
import { fingerprint, screen, type HelpKind } from '../../src/domain/assistScreen';

export type HelpWant = 'draft' | 'answer' | 'prep' | 'steps' | 'research';
export interface HelpItem { captureId: string; kind: HelpKind; draft?: { subject: string; body: string }; answer?: { text: string; unsure: boolean }; prep?: string[]; steps?: string[]; queries?: string[] }
export interface HelpResponse { items: HelpItem[]; usage?: { input: number | null; output: number | null } }
export interface HelpClient {
  settings(): Promise<{ enabled: boolean; disclosure_accepted_at: string | null; provider?: string; model?: string } | null>;
  help(ids: string[], opts: { manual: boolean; want?: HelpWant; texts: Record<string, string> }): Promise<HelpResponse>;
}
export interface HelpEntry { id: string; text: string; kind: string }
/** What one entry's assistance looks like. `stale` = made for an older version of the text. `source` says how it was produced. */
export interface HelpResult extends Omit<HelpItem, 'captureId'> { fp: string; source: 'rules' | 'auto' | 'manual'; at: number; dismissed?: boolean; failed?: boolean }
export interface HelpDiag { requests: number; items: number; inputTokens: number; outputTokens: number; cacheHits: number; skipped: number; offered: number; errors: number; retries: number }
type Timer = ReturnType<typeof setTimeout>;
interface Clock { now(): number; set(fn: () => void, ms: number): Timer; clear(t: Timer): void }
const realClock: Clock = { now: () => Date.now(), set: (fn, ms) => setTimeout(fn, ms), clear: t => clearTimeout(t) };

export const BATCH = 8, DEBOUNCE_MS = 1500, MAX_ATTEMPTS = 3;
const backoffMs = (attempt: number) => Math.min(60_000, 5_000 * 2 ** (attempt - 1));
const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

export class AssistEngine {
  private results: Record<string, HelpResult> = {};
  private entries = new Map<string, HelpEntry>();
  private queue: string[] = [];            // ids waiting for an automatic look, in order
  private inFlight = new Set<string>();
  private timer: Timer | null = null;
  private attempts = 0;
  private retryAt = 0;
  private ready = false;
  private key = '';
  private epoch = 0;
  private version = 0;
  private listeners = new Set<() => void>();
  private manualBusy = new Set<string>();
  readonly diag: HelpDiag = { requests: 0, items: 0, inputTokens: 0, outputTokens: 0, cacheHits: 0, skipped: 0, offered: 0, errors: 0, retries: 0 };
  error = '';
  constructor(private client: HelpClient | null, private storage?: Pick<Storage, 'getItem' | 'setItem'>, private clock: Clock = realClock, private onGenerated?: (id: string, kind: HelpKind) => void) {}

  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getVersion = () => this.version;
  private emit() { this.version++; for (const fn of this.listeners) fn(); }
  private save() { try { this.storage?.setItem(this.key, JSON.stringify(this.results)); } catch { /* the cache is optional */ } }

  /** Cache identity = account + provider + model + schema (inside each fingerprint). Another account never sees this account's results. */
  configure(owner: string, config: Awaited<ReturnType<HelpClient['settings']>>) {
    this.epoch++; this.cancelTimer(); this.queue = []; this.inFlight.clear(); this.attempts = 0; this.retryAt = 0; this.error = '';
    this.ready = !!this.client && !!config?.enabled && !!config.disclosure_accepted_at;   // consent first: nothing is sent without it
    this.key = `exe-help-v1:${JSON.stringify([owner, config?.provider ?? 'none', config?.model ?? 'none'])}`;
    this.results = {};
    try { const raw = this.storage?.getItem(this.key); const v: unknown = raw ? JSON.parse(raw) : null; if (record(v)) for (const [id, r] of Object.entries(v)) if (record(r) && typeof r.fp === 'string' && typeof r.kind === 'string') this.results[id] = r as unknown as HelpResult; } catch { this.results = {}; }
    for (const e of this.entries.values()) this.consider(e);
    this.schedule(); this.emit();
  }
  deactivate() { this.epoch++; this.ready = false; this.cancelTimer(); this.queue = []; this.inFlight.clear(); }

  /** Called with the current entries after any save. Unchanged entries cost nothing; only changed ones are screened again. */
  update(list: HelpEntry[]) {
    let changed = false;
    const next = new Map(list.map(e => [e.id, e]));
    for (const [id, e] of next) { const old = this.entries.get(id); if (!old || old.text !== e.text || old.kind !== e.kind) { this.entries.set(id, e); this.consider(e); changed = true; } }
    for (const id of [...this.entries.keys()]) if (!next.has(id)) { this.entries.delete(id); this.queue = this.queue.filter(q => q !== id); changed = true; }
    if (changed) { this.schedule(); this.emit(); }
  }
  private consider(e: HelpEntry) {
    const fp = fingerprint(e.text, e.kind), r = this.results[e.id];
    if (r && r.fp === fp) { this.diag.cacheHits++; return; }                         // same content: reuse, never regenerate
    const s = screen(e.text, e.kind);
    if (s.verdict === 'skip') { if (r) delete this.results[e.id]; this.results[e.id] = { fp, kind: 'none', source: 'rules', at: this.clock.now() }; this.diag.skipped++; this.queue = this.queue.filter(q => q !== e.id); this.save(); return; }
    if (s.verdict === 'offer') { this.results[e.id] = { fp, kind: s.kind, source: 'rules', at: this.clock.now() }; this.diag.offered++; this.queue = this.queue.filter(q => q !== e.id); this.save(); return; }
    // an old result for different text stays visible but marked stale until the new look arrives
    if (!this.queue.includes(e.id) && !this.inFlight.has(e.id)) this.queue.push(e.id);
  }
  private cancelTimer() { if (this.timer) { this.clock.clear(this.timer); this.timer = null; } }
  /** Debounced: a burst of saves (or keystrokes reaching the store) becomes one run after things settle. */
  private schedule(delay = DEBOUNCE_MS) {
    if (!this.ready || !this.queue.length || this.inFlight.size) return;
    this.cancelTimer();
    const wait = Math.max(delay, this.retryAt - this.clock.now());
    this.timer = this.clock.set(() => { this.timer = null; void this.flush(); }, wait);
  }
  /** One automatic request at a time, at most 8 entries. Failures back off (bounded) and then give up on that batch, so the queue never jams. */
  async flush() {
    if (!this.client || !this.ready || this.inFlight.size || this.clock.now() < this.retryAt) return;
    const batch = this.queue.slice(0, BATCH).filter(id => this.entries.has(id)); if (!batch.length) return;
    const epoch = this.epoch, sent = new Map(batch.map(id => [id, this.entries.get(id)!]));
    batch.forEach(id => this.inFlight.add(id)); this.queue = this.queue.filter(id => !this.inFlight.has(id)); this.emit();
    this.diag.requests++; this.diag.items += batch.length;
    try {
      const r = await this.client.help(batch, { manual: false, texts: Object.fromEntries([...sent].map(([id, e]) => [id, e.text])) });
      if (epoch !== this.epoch) return;
      this.attempts = 0; this.retryAt = 0; this.error = '';
      this.account(r);
      for (const id of batch) {
        const e = this.entries.get(id), was = sent.get(id)!; if (!e || e.text !== was.text || e.kind !== was.kind) continue;   // edited while waiting: its new version is queued
        const it = r.items.find(x => x.captureId === id) ?? { captureId: id, kind: 'none' as const };
        this.store(id, it, fingerprint(was.text, was.kind), 'auto');
      }
    } catch (err) {
      if (epoch !== this.epoch) return;
      this.diag.errors++;
      const at = (err as { retryAt?: unknown })?.retryAt;
      this.attempts++;
      if (this.attempts >= MAX_ATTEMPTS) {
        // give up on this batch until its text changes or the person asks; the rest of the queue carries on later
        for (const id of batch) { const e = sent.get(id)!; this.results[id] = { fp: fingerprint(e.text, e.kind), kind: 'none', source: 'auto', at: this.clock.now(), failed: true }; }
        this.attempts = 0; this.save();
      } else {
        this.diag.retries++;
        this.queue = [...batch, ...this.queue.filter(id => !batch.includes(id))];
      }
      this.retryAt = this.clock.now() + Math.max(typeof at === 'number' ? at - this.clock.now() : 0, backoffMs(Math.max(1, this.attempts)));
      this.error = err instanceof Error ? err.message : 'AI help is unavailable right now.';
    } finally {
      if (epoch === this.epoch) { batch.forEach(id => this.inFlight.delete(id)); this.schedule(); this.emit(); }
    }
  }
  private account(r: HelpResponse) { if (typeof r.usage?.input === 'number') this.diag.inputTokens += r.usage.input; if (typeof r.usage?.output === 'number') this.diag.outputTokens += r.usage.output; }
  private store(id: string, it: HelpItem, fp: string, source: 'auto' | 'manual') {
    const { captureId: _ignored, ...rest } = it;
    const prev = this.results[id];
    this.results[id] = { ...rest, fp, source, at: this.clock.now(), dismissed: prev?.fp === fp && source === 'auto' ? prev.dismissed : undefined };
    if (it.draft || it.answer || it.prep?.length || it.steps?.length) this.onGenerated?.(id, it.kind);
    this.save();
  }

  /** "Ask Exe": works on any entry, even one the rules skipped. It goes straight out (not through the debounce) and never duplicates the automatic queue. */
  async ask(id: string, want?: HelpWant): Promise<boolean> {
    const e = this.entries.get(id); if (!this.client || !this.ready || !e || this.manualBusy.has(id)) return false;
    const epoch = this.epoch; this.manualBusy.add(id); this.queue = this.queue.filter(q => q !== id); this.emit();
    this.diag.requests++; this.diag.items++;
    try {
      const r = await this.client.help([id], { manual: true, want, texts: { [id]: e.text } });
      if (epoch !== this.epoch) return false;
      this.account(r); this.error = '';
      const it = r.items.find(x => x.captureId === id) ?? { captureId: id, kind: 'none' as const };
      this.store(id, it, fingerprint(e.text, e.kind), 'manual'); return true;
    } catch (err) {
      if (epoch === this.epoch) { this.diag.errors++; this.error = err instanceof Error ? err.message : 'AI help is unavailable right now.'; const at = (err as { retryAt?: unknown })?.retryAt; if (typeof at === 'number') this.retryAt = Math.max(this.retryAt, at); }
      return false;
    } finally { this.manualBusy.delete(id); this.emit(); }
  }
  dismiss = (id: string) => { const r = this.results[id]; if (!r) return; r.dismissed = true; this.save(); this.emit(); };
  /** The person edits a draft on this device. Nothing is sent anywhere. */
  editDraft = (id: string, body: string) => { const r = this.results[id]; if (!r?.draft) return; r.draft = { ...r.draft, body }; this.save(); this.emit(); };

  /** Assistance for one entry, with honesty flags. Results for an older version of the text are returned as stale, never as current. */
  get(id: string): (HelpResult & { stale: boolean; busy: boolean }) | null {
    const e = this.entries.get(id), r = this.results[id]; if (!e) return null;
    const busy = this.inFlight.has(id) || this.manualBusy.has(id);
    if (!r) return busy ? { fp: '', kind: 'none', source: 'auto', at: 0, stale: false, busy } : null;
    return { ...r, stale: r.fp !== fingerprint(e.text, e.kind), busy };
  }
  status() { return { ready: this.ready, error: this.error, retryAt: this.retryAt, queued: this.queue.length, inFlight: this.inFlight.size, diag: { ...this.diag } }; }
}

/** What the small indicator says. Nothing is shown for "none", for dismissed help, or while nothing is ready. */
export function indicator(r: { kind: HelpKind; draft?: unknown; answer?: unknown; dismissed?: boolean; stale?: boolean } | null): string | null {
  if (!r || r.dismissed || r.kind === 'none') return null;
  if (r.kind === 'draft') return r.draft ? 'Draft ready' : 'Can draft this';
  if (r.kind === 'quick_answer') return r.answer ? 'Answer ready' : 'Can answer this';
  if (r.kind === 'research_offer') return 'Research available';
  if (r.kind === 'breakdown_offer') return 'Can help break this down';
  return 'Preparation available';
}
