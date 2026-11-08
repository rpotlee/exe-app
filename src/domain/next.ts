// "I have N minutes" (master §10.5) and the prompts after changes (§14). Pure functions; nothing here changes any lane or priority.
import { blockerOf, isFinished, isOutcomeBlocked, isTaskBlocked } from './blocking';
import { activeIds, rankOutcomes } from './engine';
import type { Outcome, Task, Workspace } from './model';
import { stepsOf } from './progress';

/** Minutes from the user's own free-text estimate ("20 min", "about 3 hours", "1.5h", "half an hour"). null when there is no usable number. */
export function parseEffort(text: string | null | undefined): number | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/half\s+(an\s+)?hour|half-hour/.test(t)) return 30;
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/);
  if (!m) return null;
  const n = parseFloat((m[1] as string).replace(',', '.')), unit = m[2] as string;
  return Math.round(unit.startsWith('h') ? n * 60 : n);
}

export interface QuickWin { task: Task; outcome: Outcome | null; estimate: number | null; reason: string }

/** One feasible step for the time the user says they have. It never assumes a calendar or energy, never invents an estimate,
 *  and never changes the Focus board: a blocked important outcome can stay Now while a smaller step elsewhere is suggested. */
export function quickWin(ws: Workspace, minutes: number): QuickWin | null {
  const now = new Set(activeIds(ws)), order = new Map(rankOutcomes(ws).map((f, i) => [f.id, i]));
  const cands: { task: Task; outcome: Outcome | null; est: number | null; rank: number }[] = [];
  const consider = (t: Task, o: Outcome | null) => {
    if (t.done_at || t.archived_at || isTaskBlocked(ws, t.id) || (o && (o.done_at || isOutcomeBlocked(ws, o.id)))) return;
    const est = parseEffort(t.effort);
    if (est !== null && est > minutes) return;                       // known not to fit
    cands.push({ task: t, outcome: o, est, rank: o ? (now.has(o.id) ? 0 : 1) * 10_000 + (order.get(o.id) ?? 9_999) : 99_999 });
  };
  for (const o of ws.outcomes) for (const t of stepsOf(ws, o.id)) consider(t, o);
  for (const t of ws.tasks) if (!t.outcome_id) consider(t, null);
  if (!cands.length) return null;
  cands.sort((a, b) => Number(a.est === null) - Number(b.est === null) || a.rank - b.rank || a.task.position - b.task.position);   // steps known to fit come first
  const c = cands[0] as (typeof cands)[number];
  const parts = ['Ready: nothing you confirmed is blocking it.'];
  parts.push(c.est !== null ? `Your estimate is ${c.est} min, which fits in ${minutes}.` : 'You have not given it an estimate, so it may not fit.');
  if (c.outcome && now.has(c.outcome.id)) parts.push('It is in one of your active priorities.');
  else if (!c.outcome) parts.push('It is not attached to an outcome.');
  return { task: c.task, outcome: c.outcome, estimate: c.est, reason: parts.join(' ') };
}

// ------------------------------------------------------------------ prompts after meaningful changes
export interface Prompt { id: string; kind: 'decision' | 'unblocked' | 'finished'; text: string; page: 'decisions' | 'map'; targetId: string; folderId: string | null }
const DAY = 86_400_000;
const recent = (iso: string | null, now: number, days: number) => !!iso && now - Date.parse(iso) <= days * DAY;
/** Dismissed prompts are remembered by id in settings.priority_dismissed (the same list that remembers ignored priority suggestions). */
export const isDismissed = (ws: Workspace, id: string): boolean => (ws.settings?.priority_dismissed ?? []).includes(id);

export function prompts(ws: Workspace, nowMs: number): Prompt[] {
  const out: Prompt[] = [];
  for (const d of ws.decisions) {
    if (d.status !== 'resolved' || !recent(d.resolved_at, nowMs, 30)) continue;
    const held = ws.relationships.filter(r => r.kind === 'blocks' && r.confirmed && r.from_id === d.id && !isFinished(ws, r.to_id));
    if (held.length) out.push({ id: `decision:${d.id}:${d.resolved_at}`, kind: 'decision', text: `“${d.name}” is resolved. ${held.length === 1 ? '1 item it was holding up may' : `${held.length} items it was holding up may`} now be ready. Nothing was changed.`, page: 'decisions', targetId: d.id, folderId: d.folder_id });
  }
  for (const r of ws.relationships) {
    if (r.kind !== 'blocks' || !r.confirmed) continue;
    const src = ws.tasks.find(t => t.id === r.from_id);
    if (!src || !src.done_at || !recent(src.done_at, nowMs, 14) || isFinished(ws, r.to_id)) continue;
    const tgtTask = ws.tasks.find(t => t.id === r.to_id), tgtOutcome = ws.outcomes.find(o => o.id === r.to_id);
    const free = tgtTask ? !isTaskBlocked(ws, tgtTask.id) : tgtOutcome ? blockerOf(ws, tgtOutcome.id) === null : false;
    if (free) out.push({ id: `unblocked:${r.id}:${src.done_at}`, kind: 'unblocked', text: `Finishing “${src.name}” cleared the way for “${(tgtTask ?? tgtOutcome)?.name}”.`, page: 'map', targetId: (tgtTask?.outcome_id ?? tgtOutcome?.id ?? ''), folderId: tgtOutcome?.folder_id ?? ws.outcomes.find(o => o.id === tgtTask?.outcome_id)?.folder_id ?? null });
  }
  for (const o of ws.outcomes) {
    const steps = stepsOf(ws, o.id);
    if (o.done_at || !steps.length || !steps.every(t => t.done_at)) continue;
    const last = steps.reduce((m, t) => ((t.done_at as string) > m ? (t.done_at as string) : m), '');
    out.push({ id: `finished:${o.id}:${last}`, kind: 'finished', text: `Every step of “${o.name}” is done. Is the outcome finished? You decide.`, page: 'map', targetId: o.id, folderId: o.folder_id });
  }
  return out.filter(p => !isDismissed(ws, p.id));
}
