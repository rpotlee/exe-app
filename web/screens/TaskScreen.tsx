import { useMemo } from 'react';
import { groupCaptures, setCaptureDone, setTaskDone } from '../../src/domain/commands';
import { countsOf, missionGroups, type MissionTask } from '../../src/domain/mission';
import { useApp } from '../app/context';
import { MobileTopline } from '../app/Heading';
import { AssistBanner, Help } from '../ui/AssistParts';
import { Icon } from '../ui/Icon';
import { PriorityCounts, PriorityDot } from '../ui/PriorityDot';

const RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/** Every task, or one group's tasks, with the AI's help under each (email drafts, sources, answers). Used for "Show all" and for a group. */
export function TaskScreen({ groupId }: { groupId?: string }) {
  const { api, scope, assistState, priorityMode, go, modal } = useApp();
  const ws = api.ws, labels = priorityMode !== 'off';
  const hints = useMemo(() => ({ priorities: assistState.prios, groups: assistState.groups.map(g => ({ name: g.name, ids: g.ids })) }), [assistState.prios, assistState.groups]);
  const groups = useMemo(() => missionGroups(ws, scope, hints, priorityMode), [ws, scope, hints, priorityMode]);
  const g = groupId ? groups.find(x => x.id === groupId) : undefined;
  const tasks: MissionTask[] = useMemo(() => (groupId ? (g?.tasks ?? []) : groups.flatMap(x => x.tasks).sort((a, b) => Number(a.done) - Number(b.done) || (RANK[a.level ?? ''] ?? 3) - (RANK[b.level ?? ''] ?? 3))), [groups, g, groupId]);
  const c = countsOf(tasks);
  const toggle = (t: MissionTask, on: boolean) => api.run((w, cx) => (t.kind === 'task' ? setTaskDone(w, cx, t.id, on) : setCaptureDone(w, cx, t.id, on)));
  const title = groupId ? (g?.name ?? 'Group not found') : 'All tasks';
  return (
    <>
      <MobileTopline />
      <button type="button" className="back-link" onClick={() => go('focus')}><Icon name="chevron-left" /> Mission Status</button>
      <div className="mission-heading"><h1>{title}</h1><p className="mission-sub">{groupId && !g ? 'This group no longer exists.' : <>{c.total} open {c.total === 1 ? 'task' : 'tasks'}{labels && c.total > 0 && <PriorityCounts {...c} />}</>}</p></div>
      {g && <div className="t-actions">
        {g.kind === 'suggested' && <button className="primary-button" onClick={() => api.run((w, cx) => groupCaptures(w, cx, { ids: g.captureIds, name: g.name, deps: assistState.deps.filter(d => g.captureIds.includes(d.before) && g.captureIds.includes(d.after)) }))}>Group these</button>}
      </div>}
      <AssistBanner a={assistState} onSettings={() => modal({ kind: 'settings' })} hasAi />
      <ul className="t-list">{tasks.map(t => (
        <li key={t.key} className={`t-row ${t.done ? 'is-complete' : ''}`}>
          <label className="check-row"><input type="checkbox" checked={t.done} aria-label={`${t.done ? 'Reopen' : 'Complete'} ${t.text}`} onChange={e => toggle(t, e.target.checked)} /><span>{t.text}</span>
            {labels && t.captureId && <PriorityDot captureId={t.captureId} level={t.level} fromAi={t.fromAi} why={t.why} text={t.text} />}</label>
          {t.captureId && <Help item={assistState.items[t.captureId]} text={t.text} />}
        </li>))}
        {!tasks.length && <li className="small-note">Nothing here.</li>}</ul>
    </>
  );
}
