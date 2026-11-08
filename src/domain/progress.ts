// Progress comes only from steps the user actually checked. No steps means "Not measured", never 0% (master §8.5).
import type { Task, Workspace } from './model';

export const byPosition = (a: Task, b: Task): number => a.position - b.position || a.created_at.localeCompare(b.created_at);
export const stepsOf = (ws: Workspace, outcomeId: string): Task[] => ws.tasks.filter(t => t.outcome_id === outcomeId && t.archived_at === null).sort(byPosition);

export interface Progress { total: number; done: number; percent: number | null; label: string }
export function progressOf(ws: Workspace, outcomeId: string): Progress {
  const steps = stepsOf(ws, outcomeId), done = steps.filter(t => t.done_at !== null).length;
  if (!steps.length) return { total: 0, done: 0, percent: null, label: 'Not measured' };
  return { total: steps.length, done, percent: Math.round((done / steps.length) * 100), label: `${done} of ${steps.length} ${steps.length === 1 ? 'step' : 'steps'} done` };
}
