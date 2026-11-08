import { describe, expect, it } from 'vitest';
import * as C from '../domain/commands';
import { emptyWorkspace, type Workspace } from '../domain/model';
import { applyWrites, type Ctx, type Write } from '../domain/writes';
import { QueuedStore, type Remote } from './queued';
import { ConflictError } from './store';

let n = 0;
const ctx: Ctx = { owner: 'u1', now: () => '2027-01-01T00:00:00.000Z', id: () => `id-${++n}` };
const kv = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };
const settle = () => new Promise<void>(r => setTimeout(r, 5));
const caps = (text: string): Write[] => { const r = C.addCaptures(emptyWorkspace(), ctx, text); if (!r.ok) throw new Error(r.error); return r.writes; };

/** A fake server that remembers applied keys, like exe_apply_writes_once. */
function fakeRemote(): Remote & { ws: Workspace; online: boolean; loseResponses: number; conflictOn: string | null; applied: string[] } {
  const r: any = { kind: 'supabase', owner: 'u1', ws: emptyWorkspace(), online: true, loseResponses: 0, conflictOn: null, applied: [] as string[],
    async load() { if (!r.online) throw new TypeError('Failed to fetch'); return r.ws; },
    async apply() { throw new Error('unused'); },
    async applyOnce(key: string, writes: Write[]) {
      if (!r.online) throw new TypeError('Failed to fetch');
      if (r.conflictOn === key) throw new ConflictError();
      if (r.applied.includes(key)) return false;
      r.ws = applyWrites(r.ws, writes); r.applied.push(key);
      if (r.loseResponses > 0) { r.loseResponses--; throw new TypeError('Failed to fetch'); }   // applied, but the answer was lost
      return true;
    } };
  return r;
}

describe('QueuedStore', () => {
  it('keeps changes made offline, shows them after a reload, and sends them once when back online', async () => {
    const storage = kv(), remote = fakeRemote(); remote.online = false;
    const a = new QueuedStore(remote, storage, () => `k${++n}`);
    await a.apply(caps('first thought')); await a.apply(caps('second thought')); await a.flush();
    expect(a.state()).toMatchObject({ pending: 2, offline: true });
    const reloaded = new QueuedStore(remote, storage, () => `k${++n}`);                          // a new page load, same device
    expect(reloaded.state().pending).toBe(2);
    remote.online = true;
    const ws = await reloaded.load();                                                              // load() flushes first
    expect(reloaded.state()).toMatchObject({ pending: 0, offline: false });
    expect(ws.captures.map(c => c.text)).toEqual(['first thought', 'second thought']);
    expect(remote.ws.captures).toHaveLength(2);
  });

  it('a lost response never duplicates: the retry carries the same key', async () => {
    const remote = fakeRemote(), sent: string[] = [], real = remote.applyOnce.bind(remote);
    remote.applyOnce = async (k, w) => { sent.push(k); return real(k, w); };
    const q = new QueuedStore(remote, kv(), () => `k${++n}`);
    remote.loseResponses = 1;                                                                       // the server applies it, the answer is lost
    await q.apply(caps('only once')); await settle(); await q.flush(); await settle();
    expect(q.state().pending).toBe(0); expect(remote.ws.captures).toHaveLength(1);
    expect(sent.length).toBeGreaterThanOrEqual(2); expect(new Set(sent).size).toBe(1);               // retried with the SAME key
  });

  it('a conflict overwrites nothing: it is set aside, newer changes wait, and the user is offered the unsent changes', async () => {
    const remote = fakeRemote(), keys = ['fine', 'conflicting', 'after']; let i = 0;
    const q = new QueuedStore(remote, kv(), () => keys[i++] as string);
    remote.conflictOn = 'conflicting';
    await q.apply(caps('fine one')); await q.flush();
    await q.apply(caps('conflicting one')); await q.flush();
    await q.apply(caps('after the conflict')); await q.flush();
    expect(remote.ws.captures.map(c => c.text)).toEqual(['fine one']);                              // nothing past the conflict was sent
    expect(q.state()).toMatchObject({ pending: 1, conflict: [{ key: 'conflicting' }] });
    expect(q.resolveConflict().map(e => e.key)).toEqual(['conflicting']);                           // offered for download, then dropped
    await q.flush(); expect(remote.ws.captures.map(c => c.text)).toEqual(['fine one', 'after the conflict']); expect(q.state().conflict).toBeNull();
  });

  it('survives a reload with a conflict still unresolved, and corrupt storage', async () => {
    const storage = kv(), remote = fakeRemote(); remote.conflictOn = 'x1';
    const q = new QueuedStore(remote, storage, () => 'x1'); await q.apply(caps('mine')); await q.flush();
    expect(new QueuedStore(remote, storage).state().conflict).toHaveLength(1);
    storage.setItem('exe-queue:u1', '{broken'); expect(new QueuedStore(remote, storage).state().pending).toBe(0);
  });
});
