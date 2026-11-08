import { describe, expect, it } from 'vitest';
import * as C from '../domain/commands';
import { emptyWorkspace } from '../domain/model';
import { applyWrites, type Ctx } from '../domain/writes';
import { LocalStore } from './store';

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m }; };
let n = 0;
const ctx: Ctx = { owner: 'u1', now: () => '2027-01-01T00:00:00.000Z', id: () => `id-${++n}` };

describe('LocalStore', () => {
  it('starts empty and keeps what is written, across reloads', async () => {
    const kv = mem(), a = new LocalStore('u1', kv);
    expect(await a.load()).toEqual(emptyWorkspace());
    const r = C.addCaptures(emptyWorkspace(), ctx, 'Call the plumber\nBook flights');
    if (!r.ok) throw new Error(r.error);
    await a.apply(r.writes);
    const again = await new LocalStore('u1', kv).load();                // a "reload": new object, same storage
    expect(again.captures.map(c => c.text)).toEqual(['Call the plumber', 'Book flights']);
  });
  it('keeps each user separate and records audit events apart from the workspace', async () => {
    const kv = mem(), a = new LocalStore('u1', kv), b = new LocalStore('u2', kv);
    let ws = emptyWorkspace();
    const f = C.createFolder(ws, ctx, 'Home'); if (!f.ok) throw new Error(f.error); ws = applyWrites(ws, f.writes); await a.apply(f.writes);
    const d = C.deleteFolder(ws, ctx, ws.folders[0]!.id, null); if (!d.ok) throw new Error(d.error); await a.apply(d.writes);
    expect((await a.load()).folders).toEqual([]); expect((await b.load()).folders).toEqual([]);
    expect((await a.load()).audit[0]).toMatchObject({ action: 'folder-delete' });   // history lives in the workspace now
  });
  it('survives unreadable stored data', async () => {
    const kv = mem(); kv.setItem('exe-v2:u1', '{not json');
    expect(await new LocalStore('u1', kv).load()).toEqual(emptyWorkspace());
  });
});
