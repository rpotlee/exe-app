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
/** Data saved on this device before the revamp lacks the new columns; fill them with what the database would use, changing nothing else. */
function upgrade(ws: Workspace): Workspace {
  return { ...ws, captures: ws.captures.map(c => (c.kind ? c : { ...c, kind: 'todo', display_title: null, user_priority: null, remind_at: null, remind_done_at: null })), tasks: ws.tasks.map(t => (t.folder_id === undefined ? { ...t, folder_id: null } : t)) };
}
export class LocalStore implements Store {
  readonly kind = 'local' as const;
  constructor(readonly owner: string, private readonly storage: KV, private readonly prefix = 'exe-v2') {}
  private get key() { return `${this.prefix}:${this.owner}`; }
  async load(): Promise<Workspace> {
    try { const raw = this.storage.getItem(this.key); if (raw) return upgrade({ ...emptyWorkspace(), ...(JSON.parse(raw) as Workspace) }); } catch { /* unreadable storage starts empty */ }
    return emptyWorkspace();
  }
  async apply(writes: Write[]): Promise<void> {
    const ws = applyWrites(await this.load(), writes);
    this.storage.setItem(this.key, JSON.stringify(ws));
  }
}
