// The optional weekly review (master §14.3). It reports only what actually happened, from real dates. No streaks, no scores.
import { blockedCount } from './blocking';
import type { Workspace } from './model';
import { pendingCaptures } from './review';

/** ISO week label such as 2027-W09 (weeks start on Monday). */
export function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())), day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear(), w = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 86_400_000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}
export const weeklyId = (week: string): string => `weekly:${week}`;

export interface Weekly { week: string; stepsDone: { outcomeId: string | null; name: string; count: number }[]; outcomesDone: string[]; decisionsResolved: string[]; capturesAdded: number; unresolvedDecisions: number; waitingReview: number; blocked: number; anything: boolean }
export function weeklySummary(ws: Workspace, now: Date): Weekly {
  const since = now.getTime() - 7 * 86_400_000, inWeek = (iso: string | null) => !!iso && Date.parse(iso) >= since && Date.parse(iso) <= now.getTime();
  const by = new Map<string | null, number>();
  for (const t of ws.tasks) if (inWeek(t.done_at)) by.set(t.outcome_id, (by.get(t.outcome_id) ?? 0) + 1);
  const stepsDone = [...by].map(([outcomeId, count]) => ({ outcomeId, count, name: ws.outcomes.find(o => o.id === outcomeId)?.name ?? 'Steps with no outcome' })).sort((a, b) => b.count - a.count);
  const s: Weekly = {
    week: isoWeek(now), stepsDone, outcomesDone: ws.outcomes.filter(o => inWeek(o.done_at)).map(o => o.name), decisionsResolved: ws.decisions.filter(d => inWeek(d.resolved_at)).map(d => d.name),
    capturesAdded: ws.captures.filter(c => inWeek(c.created_at)).length, unresolvedDecisions: ws.decisions.filter(d => d.status === 'open').length, waitingReview: pendingCaptures(ws).length, blocked: blockedCount(ws), anything: false,
  };
  s.anything = stepsDone.length + s.outcomesDone.length + s.decisionsResolved.length + s.capturesAdded > 0;
  return s;
}
