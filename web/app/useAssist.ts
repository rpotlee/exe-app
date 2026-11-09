import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Workspace } from '../../src/domain/model';
import type { Assist, AssistItem } from './ai';
import type { AiEventInput } from '../../src/domain/activity';

/** What the live-help feature needs from the AI client (the real one, or the local fake). */
export interface AssistClient {
  settings(): Promise<{ enabled: boolean; disclosure_accepted_at: string | null } | null>;
  assist(ids: string[], texts: Record<string, string>): Promise<Assist>;
}
type Saved = { seen: Record<string, string>; items: Record<string, AssistItem>; prios: Record<string, { level: 'high' | 'medium' | 'low'; why: string }>; groups: Assist['groups']; deps: Assist['dependencies']; dismissed: string[] };
const KEY = 'exe-assist-v1', BATCH = 8, WAIT = 2500;
const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h); };
const load = (): Saved => { try { const j = JSON.parse(localStorage.getItem(KEY) ?? ''); if (j && typeof j === 'object') return { seen: {}, items: {}, prios: {}, groups: [], deps: [], dismissed: [], ...j }; } catch { /* none saved */ } return { seen: {}, items: {}, prios: {}, groups: [], deps: [], dismissed: [] }; };

/** As the list grows, quietly asks the AI about tasks it has not looked at yet (a few seconds after typing stops) and keeps what it finds.
 *  Nothing here changes the workspace: it only produces suggestions. Without AI set up, it does nothing. */
export function useAssist(ai: AssistClient | null, ws: Workspace, log?: (events: AiEventInput[]) => void) {
  const [saved, setSaved] = useState<Saved>(load), [ready, setReady] = useState<boolean | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const ref = useRef(saved); ref.current = saved;
  const keep = useCallback((fn: (s: Saved) => Saved) => setSaved(s => { const n = fn(s); try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* convenience only */ } return n; }), []);
  useEffect(() => { let on = true; if (!ai) { setReady(false); return; } ai.settings().then(s => on && setReady(!!s?.enabled && !!s.disclosure_accepted_at)).catch(() => on && setReady(false)); return () => { on = false; }; }, [ai]);

  const live = useMemo(() => ws.captures.filter(c => !c.archived_at && !c.completed_at && (c.edited_text ?? c.text).trim().length >= 6), [ws.captures]);
  const texts = useMemo(() => Object.fromEntries(live.map(c => [c.id, c.edited_text ?? c.text])), [live]);
  const todo = live.filter(c => ref.current.seen[c.id] !== hash(texts[c.id] ?? '')).slice(-BATCH);
  const sig = todo.map(c => c.id + hash(texts[c.id] ?? '')).join('|');

  const run = useCallback(async (force = false) => {
    if (!ai || busy) return;
    const batch = force ? live.slice(-BATCH) : todo; if (!batch.length) return;
    setBusy(true); setError('');
    try {
      const r = await ai.assist(batch.map(c => c.id), texts);
      if (log) {   // record what the AI prepared, in small facts only (kind, counts, ids), never the generated text
        const events: AiEventInput[] = r.items.map(it => ({ action: 'ai-help', entityType: 'capture', entityId: it.captureId, after: { kind: it.kind } }));
        const ps = r.priorities ?? []; if (ps.length) events.push({ action: 'ai-priorities', after: { total: ps.length, high: ps.filter(q => q.level === 'high').length, medium: ps.filter(q => q.level === 'medium').length, low: ps.filter(q => q.level === 'low').length } });
        for (const g of r.groups) events.push({ action: 'ai-group', after: { name: g.name, ids: g.ids } });
        for (const d of r.dependencies) events.push({ action: 'ai-depends', after: { before: d.before, after: d.after } });
        if (events.length) log(events);
      }
      keep(s => {
        const seen = { ...s.seen }, items = { ...s.items }, prios = { ...s.prios }; for (const c of batch) { seen[c.id] = hash(texts[c.id] ?? ''); delete items[c.id]; delete prios[c.id]; } for (const it of r.items) items[it.captureId] = it; for (const q of r.priorities ?? []) prios[q.captureId] = { level: q.level, why: q.why };
        const ids = new Set(batch.map(c => c.id)), same = (a: string[]) => a.every(i => ids.has(i));
        return { ...s, seen, items, prios, groups: [...s.groups.filter(g => !same(g.ids)), ...r.groups], deps: [...s.deps.filter(d => !(ids.has(d.before) && ids.has(d.after))), ...r.dependencies] };
      });
    } catch (e) { setError((e as Error).message); log?.([{ action: 'ai-failed', after: { message: (e as Error).message.slice(0, 140) } }]); keep(s => ({ ...s, seen: { ...s.seen, ...Object.fromEntries(batch.map(c => [c.id, hash(texts[c.id] ?? '')])) } })); }   // do not retry the same words in a loop
    finally { setBusy(false); }
  }, [ai, busy, live, todo, texts, keep]);

  useEffect(() => { if (!ready || !sig) return; const t = setTimeout(() => void run(), WAIT); return () => clearTimeout(t); }, [ready, sig]);   // eslint-disable-line react-hooks/exhaustive-deps

  const pending = new Set(ws.captures.filter(c => c.status === 'pending' && !c.archived_at).map(c => c.id));
  const groups = saved.groups.filter(g => g.ids.every(i => pending.has(i)) && !saved.dismissed.includes(g.ids.slice().sort().join()));
  return {
    ready, busy, error, items: saved.items, prios: saved.prios, groups, deps: saved.deps, texts,
    dismiss: (ids: string[]) => keep(s => ({ ...s, dismissed: [...s.dismissed, ids.slice().sort().join()] })),
    again: () => void run(true),
  };
}
