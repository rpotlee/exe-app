import type { Workspace } from './model';
import type { MissionGroup } from './mission';
import { captureIn, kindOf, outcomeIn, taskIn, type Scope } from './scope';

export interface Progress { completed: number; remaining: number; total: number; percent: number }
export interface ScheduledItem { key: string; title: string; dueAt: number; kind: 'deadline' | 'reminder' }
export interface ScheduleSummary { missed: ScheduledItem[]; upcoming: ScheduledItem[] }

/** The same visible entry may be projected through more than one group while data syncs. */
export function progressOf(groups: MissionGroup[]): Progress {
  const tasks = new Map(groups.flatMap(g => g.tasks.map(t => [t.key, t] as const)));
  const total = tasks.size, completed = [...tasks.values()].filter(t => t.done).length;
  return { completed, remaining: total - completed, total, percent: total ? Math.round(completed * 100 / total) : 0 };
}

/** A date-only deadline is due through its local calendar day. */
export function deadlineEnd(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [year, month, day] = date.split('-').map(Number);
  const start = new Date(year!, month! - 1, day!);
  if (start.getFullYear() !== year || start.getMonth() !== month! - 1 || start.getDate() !== day) return null;
  return new Date(year!, month! - 1, day! + 1).getTime();
}

/** Actual deadlines and active reminders, once per underlying piece of work. */
export function scheduleSummary(ws: Workspace, scope: Scope, now: number, horizonDays = 7): ScheduleSummary {
  const byKey = new Map<string, ScheduledItem>();
  const add = (item: ScheduledItem) => { if (Number.isFinite(item.dueAt) && (!byKey.has(item.key) || item.dueAt < byKey.get(item.key)!.dueAt)) byKey.set(item.key, item); };
  for (const o of ws.outcomes) {
    if (o.done_at || !o.deadline || !outcomeIn(scope, o)) continue;
    const dueAt = deadlineEnd(o.deadline); if (dueAt !== null) add({ key: `o${o.id}`, title: o.name, dueAt, kind: 'deadline' });
  }
  for (const t of ws.tasks) {
    if (t.done_at || t.archived_at || !t.deadline || !taskIn(ws, scope, t)) continue;
    const dueAt = deadlineEnd(t.deadline); if (dueAt === null) continue;
    add({ key: t.sources[0] ? `c${t.sources[0]}` : `t${t.id}`, title: t.name, dueAt, kind: 'deadline' });
  }
  for (const c of ws.captures) {
    if (c.archived_at || c.completed_at || c.remind_done_at || !c.remind_at || !captureIn(scope, c) || kindOf(c) === 'note') continue;
    add({ key: `c${c.id}`, title: c.edited_text ?? c.text, dueAt: Date.parse(c.remind_at), kind: 'reminder' });
  }
  const all = [...byKey.values()].sort((a, b) => a.dueAt - b.dueAt || a.title.localeCompare(b.title));
  return { missed: all.filter(x => x.dueAt < now), upcoming: all.filter(x => x.dueAt >= now && x.dueAt <= now + horizonDays * 86_400_000) };
}
