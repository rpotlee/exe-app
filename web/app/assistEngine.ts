// The assistance engine screens entries locally and calls the provider only when the person asks.
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
interface Clock { now(): number }
const realClock: Clock = { now: () => Date.now() };
const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

export class AssistEngine {
  private results: Record<string, HelpResult> = {};
  private entries = new Map<string, HelpEntry>();
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
    this.epoch++; this.retryAt = 0; this.error = '';
    this.ready = !!this.client && !!config?.enabled && !!config.disclosure_accepted_at;   // consent first: nothing is sent without it
    this.key = `exe-help-v1:${JSON.stringify([owner, config?.provider ?? 'none', config?.model ?? 'none'])}`;
    this.results = {};
    try { const raw = this.storage?.getItem(this.key); const v: unknown = raw ? JSON.parse(raw) : null; if (record(v)) for (const [id, r] of Object.entries(v)) if (record(r) && typeof r.fp === 'string' && typeof r.kind === 'string') this.results[id] = r as unknown as HelpResult; } catch { this.results = {}; }
    for (const e of this.entries.values()) this.consider(e);
    this.emit();
  }
  deactivate() { this.epoch++; this.ready = false; }

  /** Called with current entries after a save. Screening is local and never calls the provider. */
  update(list: HelpEntry[]) {
    let changed = false;
    const next = new Map(list.map(e => [e.id, e]));
    for (const [id, e] of next) { const old = this.entries.get(id); if (!old || old.text !== e.text || old.kind !== e.kind) { this.entries.set(id, e); this.consider(e); changed = true; } }
    for (const id of [...this.entries.keys()]) if (!next.has(id)) { this.entries.delete(id); changed = true; }
    if (changed) this.emit();
  }
  private consider(e: HelpEntry) {
    const fp = fingerprint(e.text, e.kind), r = this.results[e.id];
    if (r && r.fp === fp) { this.diag.cacheHits++; return; }                         // same content: reuse, never regenerate
    const s = screen(e.text, e.kind);
    if (s.verdict === 'skip') { this.results[e.id] = { fp, kind: 'none', source: 'rules', at: this.clock.now() }; this.diag.skipped++; this.save(); return; }
    if (s.verdict === 'offer') { this.results[e.id] = { fp, kind: s.kind, source: 'rules', at: this.clock.now() }; this.diag.offered++; this.save(); return; }
    // Drafts and questions can show a local offer; generating their content requires a click.
    if (!r && s.hint !== 'none') { this.results[e.id] = { fp, kind: s.hint, source: 'rules', at: this.clock.now() }; this.diag.offered++; this.save(); }
    // An older generated result remains visible as stale until the person asks to refresh it.
  }
  private account(r: HelpResponse) { if (typeof r.usage?.input === 'number') this.diag.inputTokens += r.usage.input; if (typeof r.usage?.output === 'number') this.diag.outputTokens += r.usage.output; }
  private store(id: string, it: HelpItem, fp: string, source: 'auto' | 'manual') {
    const { captureId: _ignored, ...rest } = it;
    const prev = this.results[id];
    this.results[id] = { ...rest, fp, source, at: this.clock.now(), dismissed: prev?.fp === fp && source === 'auto' ? prev.dismissed : undefined };
    if (it.draft || it.answer || it.prep?.length || it.steps?.length) this.onGenerated?.(id, it.kind);
    this.save();
  }

  /** "Ask Exe" is the only provider call in this engine, including for entries the rules skipped. */
  async ask(id: string, want?: HelpWant): Promise<boolean> {
    const e = this.entries.get(id); if (!this.client || !this.ready || !e || this.manualBusy.has(id)) return false;
    const epoch = this.epoch; this.manualBusy.add(id); this.emit();
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
    const busy = this.manualBusy.has(id);
    if (!r) return busy ? { fp: '', kind: 'none', source: 'auto', at: 0, stale: false, busy } : null;
    return { ...r, stale: r.fp !== fingerprint(e.text, e.kind), busy };
  }
  status() { return { ready: this.ready, error: this.error, retryAt: this.retryAt, queued: 0, inFlight: 0, diag: { ...this.diag } }; }
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
