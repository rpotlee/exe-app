// Search across captures (including archived, labeled), steps, outcomes, decisions, ideas and folders.
// Plain text matching only: no invented "semantic" matches (DEC-003). Best match first, then newest.
import type { Workspace } from './model';

export type ResultKind = 'Capture' | 'Step' | 'Outcome' | 'Decision' | 'Idea' | 'Folder';
export interface Hit { kind: ResultKind; id: string; title: string; context: string; folderId: string | null; archived: boolean; score: number; at: string }

const norm = (s: string): string => s.toLowerCase();
/** 3 = the whole text starts with the query, 2 = a word starts with it, 1 = it appears somewhere, 0 = no match. All query words must match. */
export function score(text: string, query: string): number {
  const t = norm(text), terms = norm(query).split(/\s+/).filter(Boolean);
  if (!terms.length || !terms.every(w => t.includes(w))) return 0;
  const q = norm(query).trim();
  if (t.startsWith(q)) return 3;
  return terms.every(w => new RegExp(`(^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(t)) ? 2 : 1;
}

export function search(ws: Workspace, query: string, limit = 30): Hit[] {
  if (!query.trim()) return [];
  const folder = (id: string | null) => ws.folders.find(f => f.id === id)?.name ?? 'Not filed';
  const hits: Hit[] = [];
  const add = (h: Omit<Hit, 'score'>, text: string) => { const s = score(text, query); if (s) hits.push({ ...h, score: s }); };
  for (const c of ws.captures) add({ kind: 'Capture', id: c.id, title: c.edited_text ?? c.text, context: `${folder(c.folder_id)}${c.completed_at ? ' · Done' : ''}`, folderId: c.folder_id, archived: !!c.archived_at, at: c.created_at }, `${c.text} ${c.edited_text ?? ''}`);
  for (const t of ws.tasks) { const o = ws.outcomes.find(x => x.id === t.outcome_id); add({ kind: 'Step', id: t.id, title: t.name, context: o ? o.name : 'No outcome', folderId: o?.folder_id ?? null, archived: !!t.archived_at, at: t.created_at }, `${t.name} ${t.notes}`); }
  for (const o of ws.outcomes) add({ kind: 'Outcome', id: o.id, title: o.name, context: folder(o.folder_id), folderId: o.folder_id, archived: false, at: o.created_at }, `${o.name} ${o.description}`);
  for (const d of ws.decisions) add({ kind: 'Decision', id: d.id, title: d.name, context: `${folder(d.folder_id)} · ${d.status === 'open' ? 'Unresolved' : 'Resolved'}`, folderId: d.folder_id, archived: false, at: d.created_at }, `${d.name} ${d.description} ${d.evidence} ${d.notes} ${d.conclusion}`);
  for (const i of ws.ideas) add({ kind: 'Idea', id: i.id, title: i.name, context: folder(i.folder_id), folderId: i.folder_id, archived: !!i.archived_at, at: i.created_at }, `${i.name} ${i.notes}`);
  for (const f of ws.folders) add({ kind: 'Folder', id: f.id, title: f.name, context: 'Folder', folderId: f.id, archived: false, at: f.created_at }, `${f.name} ${f.description}`);
  const order: ResultKind[] = ['Outcome', 'Decision', 'Folder', 'Step', 'Idea', 'Capture'];   // equal matches: bigger things first, then newest
  return hits.sort((a, b) => b.score - a.score || order.indexOf(a.kind) - order.indexOf(b.kind) || b.at.localeCompare(a.at)).slice(0, limit);
}
