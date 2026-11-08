// Works without a connection. Every user action is written to a durable queue on this device first, then sent to the
// server with a unique key, so a retry (after a lost response or reconnecting) can never apply twice. If another device
// changed the same thing, nothing is overwritten: the unsent changes are set aside and shown to the user.
import type { Workspace } from '../domain/model';
import { applyWrites, type Write } from '../domain/writes';
import { ConflictError, type Store } from './store';

export interface Remote extends Store { applyOnce(key: string, writes: Write[]): Promise<boolean> }
type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export interface Entry { key: string; writes: Write[]; at: string }
export interface QueueState { pending: number; syncing: boolean; offline: boolean; conflict: Entry[] | null }

const isNetworkError = (e: unknown): boolean => e instanceof TypeError || /failed to fetch|network|load failed|fetch/i.test(String((e as Error | undefined)?.message ?? ''));

export class QueuedStore implements Store {
  readonly kind = 'supabase' as const;
  private entries: Entry[]; private conflict: Entry[] | null; private syncing = false; private offline = false; private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setInterval> | undefined;
  constructor(private readonly remote: Remote, private readonly storage: KV, private readonly newKey: () => string = () => crypto.randomUUID()) {
    this.entries = this.read('queue'); const c = this.read('conflict'); this.conflict = c.length ? c : null;
  }
  get owner() { return this.remote.owner; }
  private k(n: string) { return `exe-${n}:${this.remote.owner}`; }
  private read(n: string): Entry[] { try { return JSON.parse(this.storage.getItem(this.k(n)) ?? '[]') as Entry[]; } catch { return []; } }
  private save() {
    this.storage.setItem(this.k('queue'), JSON.stringify(this.entries));
    if (this.conflict) this.storage.setItem(this.k('conflict'), JSON.stringify(this.conflict)); else this.storage.removeItem(this.k('conflict'));
  }
  state(): QueueState { return { pending: this.entries.length, syncing: this.syncing, offline: this.offline, conflict: this.conflict }; }
  subscribe(fn: () => void): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit() { this.listeners.forEach(f => f()); }

  /** Server data with this device's unsent changes laid over it, so nothing the user did seems to vanish. */
  async load(): Promise<Workspace> {
    await this.flush();
    const server = await this.remote.load();
    return applyWrites(server, this.entries.flatMap(e => e.writes));
  }
  async apply(writes: Write[]): Promise<void> {
    this.entries.push({ key: this.newKey(), writes, at: new Date().toISOString() }); this.save(); this.emit();
    void this.flush();                                              // never blocks the screen
  }
  /** Sends queued changes in order. Stops at the first network failure (retried later) or conflict (set aside, not applied). */
  async flush(): Promise<void> {
    if (this.syncing || !this.entries.length || this.conflict) { this.arm(); return; }   // while a conflict waits for the user, nothing newer is sent
    this.syncing = true; this.emit();
    try {
      while (this.entries.length) {
        const e = this.entries[0] as Entry;
        try { await this.remote.applyOnce(e.key, e.writes); this.entries.shift(); this.offline = false; this.save(); }
        catch (err) {
          if (err instanceof ConflictError) { this.conflict = [...(this.conflict ?? []), ...this.entries]; this.entries = []; this.save(); break; }   // nothing is overwritten
          if (isNetworkError(err)) { this.offline = true; break; }
          throw err;                                                // a rule refused it: surface it, keep the queue
        }
      }
    } finally { this.syncing = false; this.arm(); this.emit(); }
  }
  private arm() {
    if (this.entries.length && !this.conflict && !this.timer) this.timer = setInterval(() => void this.flush().catch(() => undefined), 15000);
    if ((!this.entries.length || this.conflict) && this.timer) { clearInterval(this.timer); this.timer = undefined; }
  }
  /** The user has seen the conflict and chose to use the latest server version. Their unsent changes were offered for download first. */
  resolveConflict(): Entry[] { const c = this.conflict ?? []; this.conflict = null; this.save(); this.emit(); void this.flush(); return c; }
}
