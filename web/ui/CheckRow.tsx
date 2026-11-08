import { allStepsDone, setTaskDone } from '../../src/domain/commands';
import { isTaskBlocked } from '../../src/domain/blocking';
import type { Task } from '../../src/domain/model';
import { useApp } from '../app/context';
import { Icon } from './Icon';
import { PriorityChip } from './PriorityChip';
import { labelFor } from '../../src/domain/mission';

/** A step checkbox. Checking records only the step; when the last one is checked the app ASKS whether the outcome is done. */
export function CheckRow({ task, next }: { task: Task; next?: boolean }) {
  const { api, modal, assistState, priorityMode } = useApp();
  const src = task.sources.map(id => api.ws.captures.find(c => c.id === id)).find(Boolean);
  const lab = src && priorityMode !== 'off' ? labelFor(src, { priorities: assistState.prios, groups: [] }, priorityMode) : null;
  const blocked = isTaskBlocked(api.ws, task.id);
  const toggle = (checked: boolean) => {
    api.run((w, c) => setTaskDone(w, c, task.id, checked));
    if (checked && task.outcome_id && allStepsDone(api.get(), task.outcome_id)) modal({ kind: 'complete', id: task.outcome_id, prompted: true });
  };
  return (
    <label className={`check-row ${next ? 'is-next' : ''}`}>
      <input type="checkbox" checked={task.done_at !== null} aria-label={`Mark ${task.name} complete`} onChange={e => toggle(e.target.checked)} />
      <span>{task.name}</span>
      {src && lab && (lab.level || priorityMode === 'ai') && <PriorityChip captureId={src.id} level={lab.level} fromAi={lab.fromAi} why={lab.why} text={task.name} />}
      {blocked && <span className="pill red" title="Blocked by an unfinished item"><Icon name="lock" /> Blocked</span>}
    </label>
  );
}
