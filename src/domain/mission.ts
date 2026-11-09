// Priority labels (revamp spec §6.4, owner direction DEC-016): the person's own label, or the AI's suggestion shown as such. The person's always wins,
// and labels can be turned off entirely.
import type { Capture, Task, Workspace } from './model';
import { captureIn, kindOf, outcomeIn, type Scope } from './scope';

export type Level = 'high' | 'medium' | 'low';
export type PriorityMode = 'ai' | 'mine' | 'off';
export interface AiHints { priorities: Record<string, { level: Level; why: string }>; groups: { name: string; ids: string[] }[] }


export function labelFor(c: Capture | undefined, hints: AiHints, mode: PriorityMode): { level: Level | null; fromAi: boolean; why: string } {
  if (!c || mode === 'off') return { level: null, fromAi: false, why: '' };
  if (c.user_priority === 'high' || c.user_priority === 'medium' || c.user_priority === 'low') return { level: c.user_priority, fromAi: false, why: 'You set this' };
  const h = mode === 'ai' ? hints.priorities[c.id] : undefined;
  return h ? { level: h.level, fromAi: true, why: h.why } : { level: null, fromAi: false, why: '' };
}

export interface MissionTask { key: string; kind: 'capture' | 'task'; id: string; captureId: string | null; text: string; done: boolean; level: Level | null; fromAi: boolean; why: string }
export interface MissionGroup { id: string; name: string; kind: 'outcome' | 'suggested' | 'rest'; outcomeId: string | null; lane: string | null; captureIds: string[]; tasks: MissionTask[] }
export interface Counts { total: number; high: number; medium: number; low: number; none: number }

const RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
const LANE_RANK: Record<string, number> = { now: 0, next: 1, later: 2 };
const order = (a: MissionTask, b: MissionTask): number => Number(a.done) - Number(b.done) || (RANK[a.level ?? ''] ?? 3) - (RANK[b.level ?? ''] ?? 3);   // ties keep their saved order

/** How many open tasks a group has, and how many of each priority (the AI's suggestion counts until you choose). Finished tasks are not counted. */
export function countsOf(tasks: MissionTask[]): Counts {
  const open = tasks.filter(t => !t.done), n = (l: Level | null) => open.filter(t => t.level === l).length;
  return { total: open.length, high: n('high'), medium: n('medium'), low: n('low'), none: n(null) };
}

/** Everything open, as groups: your outcomes (by lane), AI-suggested groups (provisional until you act), then one group for whatever is not grouped yet. */
export function missionGroups(ws: Workspace, scope: Scope, hints: AiHints, mode: PriorityMode): MissionGroup[] {
  const caps = new Map(ws.captures.map(c => [c.id, c]));
  const groups: MissionGroup[] = [];
  for (const o of ws.outcomes.filter(x => !x.done_at && outcomeIn(scope, x))) {
    const steps = ws.tasks.filter((t: Task) => t.outcome_id === o.id && !t.archived_at).sort((a, b) => a.position - b.position);
    const tasks = steps.map((t): MissionTask => { const src = t.sources.map(id => caps.get(id)).find(Boolean); return { key: 't' + t.id, kind: 'task', id: t.id, captureId: src?.id ?? null, text: t.name, done: !!t.done_at, ...labelFor(src, hints, mode) }; }).sort(order);
    groups.push({ id: 'o' + o.id, name: o.name, kind: 'outcome', outcomeId: o.id, lane: ws.focus.find(f => f.outcome_id === o.id)?.lane ?? null, captureIds: [], tasks });
  }
  groups.sort((a, b) => (LANE_RANK[a.lane ?? ''] ?? 3) - (LANE_RANK[b.lane ?? ''] ?? 3) || a.name.localeCompare(b.name));
  const free = ws.captures.filter(c => kindOf(c) === 'todo' && !c.archived_at && c.status === 'pending' && captureIn(scope, c));      // not turned into steps yet
  const freeIds = new Set(free.map(c => c.id)), claimed = new Set<string>(), suggested: MissionGroup[] = [];
  const mk = (c: Capture): MissionTask => ({ key: 'c' + c.id, kind: 'capture', id: c.id, captureId: c.id, text: c.edited_text ?? c.text, done: !!c.completed_at, ...labelFor(c, hints, mode) });
  for (const g of hints.groups) {
    const ids = g.ids.filter(i => freeIds.has(i) && !claimed.has(i)); if (ids.length < 2) continue;
    ids.forEach(i => claimed.add(i));
    suggested.push({ id: 's' + ids.slice().sort().join('+'), name: g.name, kind: 'suggested', outcomeId: null, lane: null, captureIds: ids, tasks: ids.map(i => mk(caps.get(i) as Capture)).sort(order) });
  }
  const rest = free.filter(c => !claimed.has(c.id)).slice().reverse().map(mk).sort(order);        // newest first
  const out = [...groups, ...suggested];
  if (rest.length) out.push({ id: 'rest', name: 'Not grouped yet', kind: 'rest', outcomeId: null, lane: null, captureIds: rest.map(t => t.id), tasks: rest });
  return out;
}
