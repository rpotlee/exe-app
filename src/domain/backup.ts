// Backup restore and the prototype importer. One careful path: parse -> validate -> convert -> remap every id -> write.
// It never trusts the file: unknown columns are dropped, ownership is always the current user, ids are always fresh,
// sizes are capped, and anything that would break a rule is skipped and reported instead of failing the whole import.
import { COLUMNS, type TableName } from '../db/types';
import { reachesByBlocks } from './blocking';
import { emptyWorkspace, MAX_NOW, type Workspace } from './model';
import type { Ctx, Row, Write } from './writes';

export const MAX_BYTES = 8_000_000, MAX_ROWS = 20_000;
export type Kind = 'exe' | 'prototype';
export interface Parsed { kind: Kind; ws: Workspace; counts: Record<string, number>; warnings: string[] }
export type ParseResult = { ok: true; parsed: Parsed } | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter(isObj) : []);
const str = (v: unknown, max = 4000): string => (typeof v === 'string' ? v.slice(0, max) : '');
const iso = (v: unknown): string | null => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);
const dateOnly = (v: unknown): string | null => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const LANES = ['now', 'next', 'later', 'done'];
const meta = (id: string, now: string) => ({ id, owner_id: '', created_at: now, updated_at: now, revision: 1 });

export function countsOf(ws: Workspace): Record<string, number> {
  return { folders: ws.folders.length, outcomes: ws.outcomes.length, steps: ws.tasks.length, captures: ws.captures.length, decisions: ws.decisions.length, ideas: ws.ideas.length, relationships: ws.relationships.length };
}

/** The prototype's saved data (version 1, `workstreams`) as a Workspace with its own text ids (they are remapped on import). */
export function fromPrototype(d: Record<string, unknown>, now: string): { ws: Workspace; warnings: string[] } {
  const warnings: string[] = [], ws = emptyWorkspace();
  const ids = new Set<string>();
  const folders = arr(d.workstreams).filter(w => str(w.id) && str(w.name).trim());
  ws.folders = folders.map((w, i) => ({ ...meta(str(w.id), now), name: str(w.name, 60).trim(), description: str(w.description, 160), icon: str(w.icon) || 'folder', position: i }));
  const folderIds = new Set(ws.folders.map(f => f.id));
  const folderOf = (v: unknown) => (typeof v === 'string' && folderIds.has(v) ? v : null);
  ws.outcomes = arr(d.outcomes).filter(o => str(o.id) && str(o.name).trim()).map(o => ({ ...meta(str(o.id), now), folder_id: folderOf(o.stream), name: str(o.name, 200).trim(), description: str(o.description, 600), pinned: !!o.pinned, deadline: dateOnly(o.deadline), effort: str(o.effort, 60) || null, done_at: iso(o.doneAt), last_worked_at: iso(o.lastWorkedAt), sources: [] }));
  const oIds = new Set(ws.outcomes.map(o => o.id));
  const seen = new Set<string>(); let nowCount = 0;
  for (const f of arr(d.focusAssignments)) {
    const id = str(f.outcome); let lane = str(f.lane);
    if (!oIds.has(id) || seen.has(id) || !LANES.includes(lane)) continue; seen.add(id);
    if (lane === 'now' && ++nowCount > MAX_NOW) { lane = 'next'; warnings.push('More than three active priorities were saved; extras were moved to Next.'); }
    ws.focus.push({ ...meta('f-' + id, now), outcome_id: id, lane, position: ws.focus.length });
  }
  for (const o of ws.outcomes) if (!seen.has(o.id)) ws.focus.push({ ...meta('f-' + o.id, now), outcome_id: o.id, lane: o.done_at ? 'done' : 'later', position: ws.focus.length });
  const perOutcome = new Map<string, number>();
  ws.tasks = arr(d.tasks).filter(t => str(t.id) && str(t.name).trim()).map(t => {
    const oid = typeof t.outcome === 'string' && oIds.has(t.outcome) ? t.outcome : null, pos = perOutcome.get(oid ?? '') ?? 0; perOutcome.set(oid ?? '', pos + 1);
    return { ...meta(str(t.id), now), outcome_id: oid, name: str(t.name, 200).trim(), notes: '', folder_id: null, done_at: t.done ? (iso(t.doneAt) ?? now) : null, archived_at: iso(t.archivedAt), deadline: null, effort: null, position: pos, sources: [] };
  });
  const tIds = new Set(ws.tasks.map(t => t.id)), cIds = new Set(arr(d.captures).map(c => str(c.id)));
  ws.captures = arr(d.captures).filter(c => str(c.id) && str(c.text).trim()).map(c => {
    const edited = str(c.checklistText).trim(), review = isObj(c.review) ? str(c.review.state) : '';
    return { ...meta(str(c.id), now), kind: 'todo', display_title: null, user_priority: null, remind_at: null, remind_done_at: null, text: str(c.text).trim(), edited_text: edited && edited !== str(c.text).trim() ? edited : null, source: str(c.source, 80) || 'Imported', folder_id: folderOf(c.folder), batch_id: str(c.batchId) || null, batch_text: str(c.batchText) || null,
      completed_at: iso(c.completedAt), archived_at: iso(c.archivedAt), status: c.status === 'pending' ? 'pending' : 'organized', organized_as: ['Task', 'Outcome', 'Decision', 'Idea', 'Note', 'Merged'].includes(str(c.organizedAs)) ? str(c.organizedAs) : null,
      review_state: review === 'deferred' || review === 'rejected' ? review : null, review_at: null, rejected_fingerprints: Array.isArray(c.rejectedFps) ? c.rejectedFps.filter((x): x is string => typeof x === 'string') : [],
      task_id: typeof c.taskId === 'string' && tIds.has(c.taskId) ? c.taskId : null, merged_into: typeof c.mergedInto === 'string' && cIds.has(c.mergedInto) ? c.mergedInto : null, created_at: iso(c.createdAt) ?? now };
  });
  ws.decisions = arr(d.decisions).filter(x => str(x.id) && str(x.name).trim()).map(x => {
    const resolved = x.status === 'resolved';
    return { ...meta(str(x.id), now), folder_id: folderOf(x.stream), name: str(x.name, 200).trim(), description: str(x.description, 600), status: resolved ? 'resolved' : 'open', evidence: str(x.evidence, 20000), notes: str(x.notes, 20000), chosen_option: str(x.chosenOption, 160), conclusion: str(x.selected, 320), rationale: str(x.rationale, 800), resolved_at: resolved ? (iso(x.resolvedAt) ?? now) : null, criteria: str(x.criteria, 2000), sources: [] };
  });
  const dIds = new Set(ws.decisions.map(x => x.id));
  for (const x of arr(d.decisions)) {
    if (!dIds.has(str(x.id))) continue;
    const opts = Array.isArray(x.options) ? [...new Set(x.options.filter((o): o is string => typeof o === 'string' && !!o.trim()).map(o => o.trim().slice(0, 160)))] : [];
    const lower = new Set<string>();
    opts.forEach((text, i) => { if (lower.has(text.toLowerCase())) return; lower.add(text.toLowerCase()); ws.decisionOptions.push({ ...meta(`${str(x.id)}:o${i}`, now), decision_id: str(x.id), text, position: i, pros: '', cons: '' }); });
    for (const [i, l] of arr(x.log).entries()) { const type = str(l.type); if (['created', 'edited', 'resolved', 'reopened'].includes(type)) ws.decisionLog.push({ id: `${str(x.id)}:l${i}`, owner_id: '', decision_id: str(x.id), type, text: str(l.text, 2000), at: iso(l.at) ?? now }); }
  }
  ws.ideas = arr(d.ideas).filter(x => str(x.id) && str(x.name).trim()).map(x => ({ ...meta(str(x.id), now), folder_id: folderOf(x.stream), name: str(x.name, 200).trim(), notes: str(x.notes, 20000), archived_at: iso(x.archivedAt), sources: [] }));
  const kind = new Map<string, 'outcome' | 'task' | 'decision'>([...ws.outcomes.map(o => [o.id, 'outcome'] as const), ...ws.tasks.map(t => [t.id, 'task'] as const), ...ws.decisions.map(x => [x.id, 'decision'] as const)]);
  const rels: { from: string; to: string; kind: string; description: string; confirmed: boolean }[] = arr(d.relationships).map(r => ({ from: str(r.from), to: str(r.to), kind: str(r.kind), description: str(r.description, 160), confirmed: r.confirmed !== false }));
  for (const t of arr(d.tasks)) if (Array.isArray(t.blockedBy)) for (const b of t.blockedBy) if (typeof b === 'string') rels.push({ from: b, to: str(t.id), kind: 'blocks', description: '', confirmed: true });   // old format
  let skipped = 0;
  for (const r of rels) {
    const a = kind.get(r.from), b = kind.get(r.to);
    const bad = !a || !b || r.from === r.to || !['blocks', 'informs', 'related'].includes(r.kind) || ws.relationships.some(x => x.from_id === r.from && x.to_id === r.to && x.kind === r.kind)
      || (r.kind === 'blocks' && reachesByBlocks(ws.relationships, r.to, r.from)) || (a === 'task' && b === 'outcome' && ws.tasks.find(t => t.id === r.from)?.outcome_id === r.to) || (a === 'outcome' && b === 'task' && ws.tasks.find(t => t.id === r.to)?.outcome_id === r.from);
    if (bad || !a || !b) { skipped++; continue; }
    ws.relationships.push({ ...meta(`r${ws.relationships.length}`, now), from_type: a, from_id: r.from, to_type: b, to_id: r.to, kind: r.kind, description: r.description, confirmed: r.confirmed, source: 'user' });
  }
  if (skipped) warnings.push(`${skipped} relationship${skipped === 1 ? '' : 's'} could not be kept (missing item, loop or duplicate).`);
  const name = str(d.workspaceName, 60), cur = typeof d.currentPriority === 'string' && ws.focus.some(f => f.outcome_id === d.currentPriority && f.lane === 'now') ? (d.currentPriority as string) : null;
  if (name || cur) ws.settings = { owner_id: '', workspace_name: name, current_focus_outcome_id: cur, priority_dismissed: [], research_opt_in: false, created_at: now, updated_at: now, revision: 1 };
  void ids;
  return { ws, warnings };
}

/** Reads a file's text. Accepts this app's own backup or the prototype's. Nothing is changed until the user confirms. */
export function parseBackup(text: string, now = new Date().toISOString()): ParseResult {
  if (text.length > MAX_BYTES) return { ok: false, error: 'That file is too large to be an Exe backup.' };
  let d: unknown; try { d = JSON.parse(text); } catch { return { ok: false, error: 'That is not a valid backup file (it is not JSON).' }; }
  if (!isObj(d)) return { ok: false, error: 'That is not an Exe backup file.' };
  let ws: Workspace, kind: Kind, warnings: string[] = [];
  if (Array.isArray(d.workstreams) && Array.isArray(d.outcomes)) { kind = 'prototype'; ({ ws, warnings } = fromPrototype(d, now)); }
  else if (Array.isArray(d.folders) && Array.isArray(d.outcomes)) {
    kind = 'exe'; ws = emptyWorkspace();
    const keep = (rows: unknown, key: keyof Workspace) => { (ws[key] as unknown as Row[]) = arr(rows).filter(r => typeof r.id === 'string') as Row[]; };
    keep(d.folders, 'folders'); keep(d.outcomes, 'outcomes'); keep(d.focus, 'focus'); keep(d.tasks, 'tasks'); keep(d.captures, 'captures'); keep(d.decisions, 'decisions');
    keep(d.decisionOptions, 'decisionOptions'); keep(d.decisionLog, 'decisionLog'); keep(d.ideas, 'ideas'); keep(d.relationships, 'relationships');
    ws.settings = isObj(d.settings) ? (d.settings as unknown as Workspace['settings']) : null;
  } else return { ok: false, error: 'That does not look like an Exe backup (no folders or outcomes found).' };
  const counts = countsOf(ws);
  if (Object.values(counts).reduce((a, b) => a + b, 0) > MAX_ROWS) return { ok: false, error: 'That backup is larger than this app accepts.' };
  return { ok: true, parsed: { kind, ws, counts, warnings } };
}

const TABLE_FOR: [keyof Workspace, TableName][] = [['folders', 'folders'], ['outcomes', 'outcomes'], ['focus', 'focus_assignments'], ['tasks', 'tasks'], ['captures', 'captures'], ['decisions', 'decisions'], ['decisionOptions', 'decision_options'], ['decisionLog', 'decision_log'], ['ideas', 'ideas'], ['relationships', 'relationships']];

/** Turns parsed data into database writes: fresh ids, current owner, only real columns, rules respected. "replace" removes the current workspace first. */
export function importWrites(current: Workspace, ctx: Ctx, incoming: Workspace, mode: 'add' | 'replace'): { writes: Write[]; summary: string[] } {
  const now = ctx.now(), map = new Map<string, string>(), id = (old: unknown): string | null => (typeof old === 'string' && map.has(old) ? (map.get(old) as string) : null);
  const mint = (old: unknown) => { const k = String(old); if (!map.has(k)) map.set(k, ctx.id()); return map.get(k) as string; };
  for (const [key] of TABLE_FOR) for (const r of incoming[key] as unknown as Row[]) mint(r.id);
  const summary: string[] = [], writes: Write[] = [];
  let rev = current.settings?.revision ?? 1;
  if (mode === 'replace') {
    // clear the current focus first: otherwise deleting its outcome makes the database edit the settings row and bump its revision
    if (current.settings?.current_focus_outcome_id) { writes.push({ table: 'user_settings', op: 'update', row: { owner_id: ctx.owner, revision: rev, current_focus_outcome_id: null } }); rev++; }
    const del = (table: Write['table'], rows: { id: string }[]) => rows.forEach(r => writes.push({ table, op: 'delete', row: { id: r.id } }));
    del('relationships', current.relationships); del('decisions', current.decisions); del('ideas', current.ideas); del('captures', current.captures); del('tasks', current.tasks); del('outcomes', current.outcomes); del('folders', current.folders);
  }
  const nowKept = mode === 'add' ? current.focus.filter(f => f.lane === 'now').length : 0;
  let nowSeen = 0;
  const clean = (table: TableName, r: Row): Row => {
    const out: Row = {};
    for (const c of COLUMNS[table]) if (c in r) out[c] = r[c];
    out.id = id(r.id); out.owner_id = ctx.owner; out.revision = 1; out.updated_at = now; out.created_at = iso(r.created_at) ?? now;
    return out;
  };
  const sources = (v: unknown): string[] => (Array.isArray(v) ? v.map(id).filter((x): x is string => !!x) : []);
  const push = (table: TableName, row: Row) => writes.push({ table, op: 'insert', row });
  for (const r of incoming.folders as unknown as Row[]) push('folders', clean('folders', r));
  for (const r of incoming.outcomes as unknown as Row[]) { const o = clean('outcomes', r); o.folder_id = id(r.folder_id); o.sources = sources(r.sources); push('outcomes', o); }
  for (const r of incoming.focus as unknown as Row[]) {
    const f = clean('focus_assignments', r); f.outcome_id = id(r.outcome_id); if (!f.outcome_id) continue;
    if (f.lane === 'now' && nowKept + ++nowSeen > MAX_NOW) { f.lane = 'next'; summary.push('Some active priorities were moved to Next to keep the limit of three.'); }
    push('focus_assignments', f);
  }
  for (const r of incoming.tasks as unknown as Row[]) { const t = clean('tasks', r); t.outcome_id = id(r.outcome_id); t.sources = sources(r.sources); push('tasks', t); }
  const caps = incoming.captures as unknown as Row[];
  for (const r of [...caps.filter(c => !c.merged_into), ...caps.filter(c => c.merged_into)]) { const c = clean('captures', r); c.folder_id = id(r.folder_id); c.task_id = id(r.task_id); c.merged_into = id(r.merged_into); c.batch_id = r.batch_id ? mint('batch:' + String(r.batch_id)) : null; push('captures', c); }
  for (const r of incoming.decisions as unknown as Row[]) { const d = clean('decisions', r); d.folder_id = id(r.folder_id); d.sources = sources(r.sources); push('decisions', d); }
  for (const r of incoming.decisionOptions as unknown as Row[]) { const o = clean('decision_options', r); o.decision_id = id(r.decision_id); if (o.decision_id) push('decision_options', o); }
  for (const r of incoming.decisionLog as unknown as Row[]) { const l = clean('decision_log', r); l.decision_id = id(r.decision_id); l.at = iso(r.at) ?? now; if (l.decision_id) push('decision_log', l); }
  for (const r of incoming.ideas as unknown as Row[]) { const i = clean('ideas', r); i.folder_id = id(r.folder_id); i.sources = sources(r.sources); push('ideas', i); }
  for (const r of incoming.relationships as unknown as Row[]) { const x = clean('relationships', r); x.from_id = id(r.from_id); x.to_id = id(r.to_id); if (x.from_id && x.to_id) { x.source = 'user'; push('relationships', x); } }
  const s = incoming.settings;
  if (s) {
    const focus = s.current_focus_outcome_id ? id(s.current_focus_outcome_id) : null, nowIn = writes.some(w => w.table === 'focus_assignments' && w.row.outcome_id === focus && w.row.lane === 'now');
    const changes: Row = {};
    if (s.workspace_name && (mode === 'replace' || !current.settings?.workspace_name)) changes.workspace_name = s.workspace_name;
    if (focus && nowIn && (mode === 'replace' || !current.settings?.current_focus_outcome_id)) changes.current_focus_outcome_id = focus;
    if (Object.keys(changes).length) writes.push(current.settings ? { table: 'user_settings', op: 'update', row: { owner_id: ctx.owner, revision: rev, ...changes } }
      : { table: 'user_settings', op: 'insert', row: { owner_id: ctx.owner, workspace_name: '', current_focus_outcome_id: null, priority_dismissed: [], research_opt_in: false, created_at: now, updated_at: now, revision: 1, ...changes } });
  }
  return { writes, summary: [...new Set(summary)] };
}
