// A blocker counts only when it is a user-CONFIRMED `blocks` relationship whose source is still unfinished (master §3.4, §8.3).
import type { EntityType, Relationship, RelationshipKind, Workspace } from './model';

export const isConfirmedBlock = (r: Relationship): boolean => r.kind === 'blocks' && r.confirmed;

export function entityType(ws: Workspace, id: string): EntityType | null {
  if (ws.tasks.some(t => t.id === id)) return 'task';
  if (ws.outcomes.some(o => o.id === id)) return 'outcome';
  if (ws.decisions.some(d => d.id === id)) return 'decision';
  return null;
}

export function entityName(ws: Workspace, id: string): string {
  return ws.tasks.find(t => t.id === id)?.name ?? ws.outcomes.find(o => o.id === id)?.name ?? ws.decisions.find(d => d.id === id)?.name ?? 'Removed item';
}

/** Finished work no longer blocks anything. Archived steps count as finished for this purpose. */
export function isFinished(ws: Workspace, id: string): boolean {
  const o = ws.outcomes.find(x => x.id === id); if (o) return o.done_at !== null;
  const t = ws.tasks.find(x => x.id === id); if (t) return t.done_at !== null || t.archived_at !== null;
  const d = ws.decisions.find(x => x.id === id); if (d) return d.status !== 'open';
  return false;
}

export function blockerOf(ws: Workspace, id: string): string | null {
  const r = ws.relationships.find(x => isConfirmedBlock(x) && x.to_id === id && !isFinished(ws, x.from_id));
  return r ? r.from_id : null;
}
export const isTaskBlocked = (ws: Workspace, taskId: string): boolean => {
  const t = ws.tasks.find(x => x.id === taskId);
  return !!t && t.done_at === null && t.archived_at === null && blockerOf(ws, taskId) !== null;
};
export const isOutcomeBlocked = (ws: Workspace, outcomeId: string): boolean => {
  const o = ws.outcomes.find(x => x.id === outcomeId);
  return !!o && o.done_at === null && blockerOf(ws, outcomeId) !== null;
};
/** "K blocked" in the state line: unfinished blocked steps plus blocked outcomes. */
export const blockedCount = (ws: Workspace): number =>
  ws.tasks.filter(t => isTaskBlocked(ws, t.id)).length + ws.outcomes.filter(o => isOutcomeBlocked(ws, o.id)).length;

/** Does following `blocks` edges from `start` reach `goal`? Used to reject dependency loops. */
export function reachesByBlocks(rels: Relationship[], start: string, goal: string): boolean {
  const adj = new Map<string, string[]>();
  for (const r of rels) if (r.kind === 'blocks') adj.set(r.from_id, [...(adj.get(r.from_id) ?? []), r.to_id]);
  const seen = new Set<string>(); const stack = [start];
  while (stack.length) {
    const n = stack.pop() as string;
    if (n === goal) return true;
    if (seen.has(n)) continue; seen.add(n);
    for (const x of adj.get(n) ?? []) stack.push(x);
  }
  return false;
}

/** Explains why a relationship is not allowed, or returns null. Mirrors the database trigger so the UI can say why first. */
export function relationshipError(ws: Workspace, r: { from: string; to: string; kind: RelationshipKind }): string | null {
  if (!['blocks', 'informs', 'related'].includes(r.kind)) return 'Choose how the two items are related.';
  const a = entityType(ws, r.from), b = entityType(ws, r.to);
  if (!a || !b) return 'Both items must exist.';
  if (r.from === r.to) return 'An item cannot be related to itself.';
  const t = ws.tasks.find(x => x.id === r.from || x.id === r.to);
  const o = ws.outcomes.find(x => x.id === r.from || x.id === r.to);
  if (t && o && t.outcome_id === o.id) return 'A task and its own outcome are already linked; choose a different item.';
  if (ws.relationships.some(x => x.from_id === r.from && x.to_id === r.to && x.kind === r.kind)) return 'That relationship already exists.';
  if (r.kind === 'blocks' && reachesByBlocks(ws.relationships, r.to, r.from))
    return `That would create a loop: “${entityName(ws, r.from)}” already depends on “${entityName(ws, r.to)}”. Dependencies cannot circle back.`;
  return null;
}
