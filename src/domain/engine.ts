// Priority Engine (DEC-003 P-07). Suggestion only: it never moves a lane. Pure functions, no storage access.
// Rule order, the first rule that separates two outcomes wins, and the winning rule is explained in words:
//   1 pinned by the user  2 not blocked by a confirmed blocker  3 earliest user-entered deadline
//   4 unlocks the most confirmed dependent work  5 has a ready next step  6 most recently worked on
// Ties keep the current Now outcomes where they are. There is no numeric score.
import { isConfirmedBlock, isOutcomeBlocked, isTaskBlocked } from './blocking';
import { MAX_NOW, type Outcome, type Workspace } from './model';
import { stepsOf } from './progress';

export interface Facts { id: string; pinned: boolean; blocked: boolean; deadline: string; unlocks: number; ready: boolean; worked: string }
export interface Change { add: string; remove: string | null; why: string }
export interface Suggestion { changes: Change[]; fingerprint: string }
export type DateFormatter = (isoDate: string) => string;

const defaultDate: DateFormatter = d => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export const activeIds = (ws: Workspace): string[] => ws.focus.filter(f => f.lane === 'now').map(f => f.outcome_id);

export function unlocksOf(ws: Workspace, outcomeId: string): number {
  const own = new Set<string>([outcomeId, ...ws.tasks.filter(t => t.outcome_id === outcomeId).map(t => t.id)]);
  return ws.relationships.filter(r => {
    if (!isConfirmedBlock(r) || !own.has(r.from_id) || own.has(r.to_id)) return false;
    const target = ws.tasks.find(t => t.id === r.to_id);
    if (target) return target.done_at === null && !(target.outcome_id && own.has(target.outcome_id));
    return true;
  }).length;
}

export const hasReadyStep = (ws: Workspace, outcomeId: string): boolean =>
  stepsOf(ws, outcomeId).some(t => t.done_at === null && !isTaskBlocked(ws, t.id));

export function factsOf(ws: Workspace, o: Outcome): Facts {
  return { id: o.id, pinned: o.pinned, blocked: isOutcomeBlocked(ws, o.id), deadline: o.deadline ?? '', unlocks: unlocksOf(ws, o.id), ready: hasReadyStep(ws, o.id), worked: o.last_worked_at ?? '' };
}

type RuleName = 'pinned' | 'unblocked' | 'deadline' | 'unlocks' | 'ready' | 'worked';
export function compareFacts(a: Facts, b: Facts): { win: 1 | -1 | 0; rule: RuleName | null } {
  const rules: [RuleName, number, number][] = [
    ['pinned', +a.pinned, +b.pinned],
    ['unblocked', +!a.blocked, +!b.blocked],
    ['deadline', a.deadline ? -Date.parse(a.deadline) : -Infinity, b.deadline ? -Date.parse(b.deadline) : -Infinity],
    ['unlocks', a.unlocks, b.unlocks],
    ['ready', +a.ready, +b.ready],
    ['worked', a.worked ? Date.parse(a.worked) : 0, b.worked ? Date.parse(b.worked) : 0],
  ];
  for (const [rule, x, y] of rules) if (x !== y) return { win: x > y ? 1 : -1, rule };
  return { win: 0, rule: null };
}

const words = (fmt: DateFormatter): Record<RuleName, (w: Facts, l: Facts) => string> => ({
  pinned: () => 'You pinned it.',
  unblocked: () => 'It is not held up by a confirmed blocker; the other one is.',
  deadline: (w, l) => l.deadline ? `Its deadline (${fmt(w.deadline)}) comes before the other one's (${fmt(l.deadline)}).` : `It has a deadline you entered (${fmt(w.deadline)}); the other has none.`,
  unlocks: (w, l) => `Finishing it unlocks ${w.unlocks} confirmed dependent ${w.unlocks === 1 ? 'item' : 'items'}; the other unlocks ${l.unlocks}.`,
  ready: () => 'It has a ready next step; the other does not.',
  worked: () => 'You worked on it more recently.',
});
export function whyWins(winner: Facts, loser: Facts, fmt: DateFormatter = defaultDate): string {
  const c = compareFacts(winner, loser);
  return c.rule ? words(fmt)[c.rule](winner, loser) : '';
}

/** All unfinished outcomes, best first. Ties keep current Now outcomes first, then stored order. */
export function rankOutcomes(ws: Workspace): Facts[] {
  const now = new Set(activeIds(ws));
  return ws.outcomes.filter(o => o.done_at === null).map((o, i) => ({ f: factsOf(ws, o), i }))
    .sort((x, y) => {
      const c = compareFacts(x.f, y.f);
      if (c.win) return -c.win;
      return (Number(now.has(y.f.id)) - Number(now.has(x.f.id))) || x.i - y.i;
    }).map(x => x.f);
}

/** Why an outcome deserves an open Now slot even when nothing is being replaced. Empty when nothing justifies it. */
export const openSlotReason = (f: Facts, fmt: DateFormatter = defaultDate): string =>
  f.blocked ? '' : f.pinned ? 'You pinned it.' : f.deadline ? `It has a deadline you entered (${fmt(f.deadline)}).` : f.unlocks ? `Finishing it unlocks ${f.unlocks} confirmed dependent ${f.unlocks === 1 ? 'item' : 'items'}.` : '';

export function computeSuggestion(ws: Workspace, fmt: DateFormatter = defaultDate): Suggestion | null {
  const ranked = rankOutcomes(ws), top = ranked.slice(0, MAX_NOW).map(f => f.id), now = activeIds(ws);
  const enter = top.filter(id => !now.includes(id)), leave = now.filter(id => !top.includes(id));
  const facts = Object.fromEntries(ranked.map(f => [f.id, f])) as Record<string, Facts>;
  const changes: Change[] = [];
  for (const id of enter) {
    const out = leave.shift();
    if (out) changes.push({ add: id, remove: out, why: whyWins(facts[id] as Facts, facts[out] as Facts, fmt) });
    else if (now.length + changes.filter(c => !c.remove).length < MAX_NOW) {
      const why = openSlotReason(facts[id] as Facts, fmt);
      if (why) changes.push({ add: id, remove: null, why });
    }
  }
  if (!changes.length) return null;
  return { changes, fingerprint: JSON.stringify(changes.map(c => [c.add, c.remove, facts[c.add], c.remove && facts[c.remove]])) };
}

/** Applying a suggestion yields the new Now list; it refuses anything that would exceed three. */
export function applySuggestion(ws: Workspace, s: Suggestion): { now: string[]; demoted: string[] } | null {
  const now = activeIds(ws);
  if (!s.changes.every(c => !now.includes(c.add) && (!c.remove || now.includes(c.remove)))) return null;   // out of date
  const removed = s.changes.flatMap(c => (c.remove ? [c.remove] : []));
  const after = now.filter(id => !removed.includes(id)).concat(s.changes.map(c => c.add));
  return after.length > MAX_NOW ? null : { now: after, demoted: removed };
}

