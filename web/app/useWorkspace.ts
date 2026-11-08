import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Result } from '../../src/domain/commands';
import { emptyWorkspace, type Workspace } from '../../src/domain/model';
import { applyWrites, realCtx, type Ctx } from '../../src/domain/writes';
import { ConflictError, type Store } from '../../src/store/store';

export type SaveState = 'saved' | 'saving' | 'error';

/** Holds the workspace on screen. Every change is a pure command: it is shown at once, then saved all-or-nothing. */
export function useWorkspace(store: Store) {
  const [ws, setWs] = useState<Workspace | null>(null);
  const [loadError, setLoadError] = useState('');
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(false);
  const [toast, setToast] = useState('');
  const ref = useRef<Workspace>(emptyWorkspace());
  const chain = useRef<Promise<void>>(Promise.resolve());
  const timer = useRef<number | undefined>(undefined);
  const ctx = useMemo<Ctx>(() => realCtx(store.owner), [store]);

  const flash = useCallback((m: string) => { setToast(m); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setToast(''), 2600); }, []);
  const reload = useCallback(async () => { const w = await store.load(); ref.current = w; setWs(w); }, [store]);
  useEffect(() => { let live = true; store.load().then(w => { if (live) { ref.current = w; setWs(w); } }).catch((e: Error) => live && setLoadError(e.message)); return () => { live = false; }; }, [store]);

  const run = useCallback((build: (ws: Workspace, ctx: Ctx) => Result): boolean => {
    const r = build(ref.current, ctx);
    if (!r.ok) { flash(r.error); return false; }
    ref.current = applyWrites(ref.current, r.writes); setWs(ref.current);
    if (r.note) flash(r.note);
    setPending(n => n + 1); setFailed(false);
    chain.current = chain.current.then(() => store.apply(r.writes)).catch(async (e: unknown) => {
      setFailed(true); flash(e instanceof ConflictError ? e.message : 'Could not save that. Showing what is saved.');
      try { await reload(); } catch { /* keep what is on screen */ }
    }).finally(() => setPending(n => n - 1));
    return true;
  }, [ctx, flash, reload, store]);

  const state: SaveState = failed ? 'error' : pending > 0 ? 'saving' : 'saved';
  const get = useCallback(() => ref.current, []);
  return { ws, loadError, run, toast, flash, state, ctx, reload, get };
}
export type Api = ReturnType<typeof useWorkspace> & { ws: Workspace };
