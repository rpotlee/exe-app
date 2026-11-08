import { describe, expect, it } from 'vitest';
import { blockedCount } from './blocking';
import { computeSuggestion } from './engine';
import { emptyWorkspace, type Workspace } from './model';
import { progressOf } from './progress';
import { search } from './search';

const base = { owner_id: 'u', created_at: '2027-01-01T00:00:00Z', updated_at: '', revision: 1 };
function big(outcomes = 300, tasksPer = 5, captures = 2000, rels = 400): Workspace {
  const ws = emptyWorkspace();
  for (let o = 0; o < outcomes; o++) {
    ws.outcomes.push({ ...base, id: `o${o}`, folder_id: null, name: `Outcome ${o} pricing`, description: '', pinned: false, deadline: null, effort: null, done_at: null, last_worked_at: null, sources: [] });
    ws.focus.push({ ...base, id: `f${o}`, outcome_id: `o${o}`, lane: o < 3 ? 'now' : 'next', position: o });
    for (let t = 0; t < tasksPer; t++) ws.tasks.push({ ...base, id: `t${o}-${t}`, outcome_id: `o${o}`, name: `Step ${t}`, notes: '', folder_id: null, done_at: null, archived_at: null, deadline: null, effort: null, position: t, sources: [] });
  }
  for (let r = 0; r < rels; r++) ws.relationships.push({ ...base, id: `r${r}`, from_type: 'task', from_id: `t${r}-0`, to_type: 'task', to_id: `t${r + 1}-0`, kind: 'blocks', description: '', confirmed: true, source: 'user' });
  for (let c = 0; c < captures; c++) ws.captures.push({ ...base, id: `c${c}`, kind: 'todo', display_title: null, user_priority: null, text: `thought ${c} plumber`, edited_text: null, source: 'Inbox', folder_id: null, batch_id: null, batch_text: null, completed_at: null, archived_at: null, status: 'pending', organized_as: null, review_state: null, review_at: null, rejected_fingerprints: [], task_id: null, merged_into: null });
  return ws;
}
const ms = (fn: () => unknown): number => { const t = performance.now(); fn(); return performance.now() - t; };

describe('core logic stays fast on a very large workspace', () => {
  const ws = big();
  it('priority engine, blocked count, progress and search run in well under a second each', () => {
    const t = { engine: ms(() => computeSuggestion(ws)), blocked: ms(() => blockedCount(ws)), progress: ms(() => ws.outcomes.forEach(o => progressOf(ws, o.id))), search: ms(() => search(ws, 'plumber 1999')) };
    console.log(JSON.stringify(Object.fromEntries(Object.entries(t).map(([k, v]) => [k, Math.round(v) + 'ms']))));
    for (const [k, v] of Object.entries(t)) expect(v, k).toBeLessThan(400);
  });
});
