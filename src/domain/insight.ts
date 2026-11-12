// Explanations and rankings that come ONLY from confirmed data (master §9.2, §11.2, §11.4, §3.4). Nothing here changes anything.
import { entityName, entityType, isFinished, isOutcomeBlocked, isTaskBlocked } from './blocking';
import { activeIds, factsOf } from './engine';
import type { AuditEvent, Decision, Workspace } from './model';
import { stepsOf } from './progress';

// ------------------------------------------------------------------ Decision queue: sorted by verified impact on active work
export interface DecisionRow { decision: Decision; held: string[]; earliestDeadline: string | null }
/** Unfinished items a decision is holding up through CONFIRMED blocks, and the soonest user-entered deadline among them. */
export function impactOf(ws: Workspace, d: Decision): DecisionRow {
  const held = ws.relationships.filter(r => r.kind === 'blocks' && r.confirmed && r.from_id === d.id && !isFinished(ws, r.to_id)).map(r => r.to_id);
  const deadlines = held.flatMap(id => {
    const t = ws.tasks.find(x => x.id === id), o = ws.outcomes.find(x => x.id === id) ?? ws.outcomes.find(x => x.id === t?.outcome_id);
    return [t?.deadline, o?.deadline].filter((x): x is string => !!x);
  }).sort();
  return { decision: d, held, earliestDeadline: deadlines[0] ?? null };
}
/** Open decisions first. Among them: most held-up work, then the earliest user-entered deadline, then newest. Never ranked by how persuasive the text is. */
export function rankDecisions(ws: Workspace): DecisionRow[] {
  return ws.decisions.map(d => impactOf(ws, d)).sort((a, b) => {
    const ao = a.decision.status === 'open', bo = b.decision.status === 'open';
    if (ao !== bo) return ao ? -1 : 1;
    if (!ao) return (b.decision.resolved_at ?? '').localeCompare(a.decision.resolved_at ?? '');
    return b.held.length - a.held.length || (a.earliestDeadline ?? '9999').localeCompare(b.earliestDeadline ?? '9999') || b.decision.created_at.localeCompare(a.decision.created_at);
  });
}

// ------------------------------------------------------------------ "Why this?" on the Current Priority card
export interface Why { lines: string[]; blockers: { id: string; name: string; type: 'task' | 'outcome' | 'decision' }[] }
/** Plain reasons, from the same facts the Priority Engine uses. If nothing special applies it says so, instead of inventing a reason. */
export function whyCurrent(ws: Workspace, outcomeId: string, fmt: (iso: string) => string = d => d): Why {
  const o = ws.outcomes.find(x => x.id === outcomeId), lines: string[] = [];
  if (!o) return { lines: [], blockers: [] };
  const f = factsOf(ws, o), now = activeIds(ws);
  lines.push(now.includes(o.id) ? `It is one of your ${now.length} active ${now.length === 1 ? 'priority' : 'priorities'}, and you chose it as the current focus.` : 'You chose it as the current focus.');
  if (o.pinned) lines.push('You pinned it.');
  if (o.deadline) lines.push(`It has a deadline you entered: ${fmt(o.deadline)}.`);
  if (f.unlocks) lines.push(`Finishing it would unlock ${f.unlocks} confirmed dependent ${f.unlocks === 1 ? 'item' : 'items'}.`);
  const next = stepsOf(ws, o.id).find(t => !t.done_at && !isTaskBlocked(ws, t.id));
  if (next) lines.push(`It has a ready next step: “${next.name}”.`);
  else if (stepsOf(ws, o.id).length) lines.push('No step is ready right now.');
  if (o.last_worked_at) lines.push(`You last worked on it ${fmt(o.last_worked_at.slice(0, 10))}.`);
  const blockers = ws.relationships.filter(r => r.kind === 'blocks' && r.confirmed && r.to_id === o.id && !isFinished(ws, r.from_id))
    .map(r => ({ id: r.from_id, name: entityName(ws, r.from_id), type: entityType(ws, r.from_id) ?? 'task' }));
  return { lines, blockers: isOutcomeBlocked(ws, o.id) ? blockers : [] };
}

// ------------------------------------------------------------------ History: what the person approved or applied, in words
export function describeAudit(ws: Workspace, e: AuditEvent): string {
  const name = (id: unknown) => (typeof id === 'string' ? entityName(ws, id) : 'an item');
  const a = (e.after ?? {}) as Record<string, unknown>, b = (e.before ?? {}) as Record<string, unknown>;
  switch (e.action) {
    case 'priority-apply': { const ids = (a.now as string[] | undefined) ?? []; return `You applied a priority suggestion. Active now: ${ids.map(name).join(', ') || 'none'}.`; }
    case 'outcome-done': return `You confirmed the outcome “${name(e.entity_id)}” is done.`;
    case 'folder-delete': return `You deleted the folder “${String(b.name ?? '')}”. ${Number(b.moved ?? 0)} ${Number(b.moved ?? 0) === 1 ? 'item was' : 'items were'} kept and moved.`;
    case 'approval-undo': return `You undid an approval (${String(b.type ?? 'item')}). The original capture is back in AI Review.`;
    case 'idea-promoted': return `You promoted the idea “${name(e.entity_id)}” to an outcome.`;
    case 'group-move': return `You moved ${name(e.entity_id)} to ${a.group ? (ws.outcomes.find(o => o.id === a.group)?.name ?? String(a.group)) : 'Ungrouped'}.`;
    case 'ai-group-applied': return `AI matched ${name(e.entity_id)} to ${a.group ? (ws.outcomes.find(o => o.id === a.group)?.name ?? String(a.group)) : 'a group'}.`;
    default: return e.action;
  }
}
