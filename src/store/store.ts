import { applyWrites, type Write } from '../domain/writes';
import { emptyWorkspace, type Workspace } from '../domain/model';

/** Something the app reads and writes through. A write list is applied all-or-nothing. */
export interface Store {
  readonly kind: 'local' | 'supabase';
  readonly owner: string;
  load(): Promise<Workspace>;
  apply(writes: Write[]): Promise<void>;
}
/** Someone else changed a row since this device last loaded it. Never overwritten silently. */
export class ConflictError extends Error { constructor(message = 'This changed on another device. Showing the latest version.') { super(message); this.name = 'ConflictError'; } }

type KV = Pick<Storage, 'getItem' | 'setItem'>;

/** Keeps the whole workspace in browser storage: works with no account and no network. */
export class LocalStore implements Store {
  readonly kind = 'local' as const;
  constructor(readonly owner: string, private readonly storage: KV, private readonly prefix = 'exe-v2') {}
  private get key() { return `${this.prefix}:${this.owner}`; }
  async load(): Promise<Workspace> {
    try { const raw = this.storage.getItem(this.key); if (raw) return { ...emptyWorkspace(), ...(JSON.parse(raw) as Workspace) }; } catch { /* unreadable storage starts empty */ }
    return emptyWorkspace();
  }
  async apply(writes: Write[]): Promise<void> {
    const ws = applyWrites(await this.load(), writes);
    this.storage.setItem(this.key, JSON.stringify(ws));
  }
}
