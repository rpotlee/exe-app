import { useMemo } from 'react';
import { groupCaptures, setCaptureDone, setTaskDone } from '../../src/domain/commands';
import { countsOf, missionGroups, type MissionTask } from '../../src/domain/mission';
import { useApp } from '../app/context';
import { MobileTopline } from '../app/Heading';
import { AssistBanner } from '../ui/AssistParts';
import { statusLine, useEntryState } from '../ui/EntryAssistant';
import { Icon } from '../ui/Icon';
import { PriorityCounts, PriorityDot } from '../ui/PriorityDot';

const RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/** One task: a round checkbox, its text (tap to open the assistant for it), a small colored mark when the AI has interacted with it, and its priority dot. */
function TaskRow({ t, labels, toggle }: { t: MissionTask; labels: boolean; toggle: (t: MissionTask, on: boolean) => void }) {
  const { openEntry, modal } = useApp();
  const st = useEntryState(t.captureId ?? '', t.text), line = t.captureId ? statusLine(st) : null, open = () => t.captureId && openEntry(t.captureId);
  return (
    <li className={`t-row ${t.done ? 'is-complete' : ''}`}>
      <label className="t-check"><input type="checkbox" checked={t.done} aria-label={`${t.done ? 'Reopen' : 'Complete'} ${t.text}`} onChange={e => toggle(t, e.target.checked)} /></label>
      {t.captureId ? <button type="button" className="t-text" onClick={open} aria-label={`Open ${t.text}`}>{t.text}</button> : <span className="t-text">{t.text}</span>}
      {line && <button type="button" className={`ai-mark ${st?.question ? 'ask' : ''}`} onClick={open} aria-label={`AI: ${line}. Open details`} title={line}><Icon name="sparkles" /></button>}
      {labels && t.captureId && <PriorityDot captureId={t.captureId} level={t.level} fromAi={t.fromAi} why={t.why} text={t.text} />}
      <button type="button" className="t-move" onClick={() => modal({ kind: 'moveGroup', entryKey: t.key })} aria-label={`Move ${t.text} to another group`} title="Move to group"><Icon name="layers" size={18} /></button>
    </li>
  );
}

const SECTIONS: { key: 'high' | 'medium' | 'low' | 'none'; label: string }[] = [{ key: 'high', label: 'High priority' }, { key: 'medium', label: 'Medium' }, { key: 'low', label: 'Low' }, { key: 'none', label: 'No priority' }];

/** Every task, or one group's tasks, with the AI's help under each (email drafts, sources, answers). Used for "Show all" and for a group. */
export function TaskScreen({ groupId }: { groupId?: string }) {
  const { api, scope, assistState, priorityMode, go, modal } = useApp();
  const ws = api.ws, labels = priorityMode !== 'off';
  const hints = useMemo(() => ({ priorities: assistState.prios, groups: assistState.groups.map(g => ({ name: g.name, ids: g.ids, updatedAt: g.updatedAt })) }), [assistState.prios, assistState.groups]);
  const groups = useMemo(() => missionGroups(ws, scope, hints, priorityMode), [ws, scope, hints, priorityMode]);
  const g = groupId ? groups.find(x => x.id === groupId) : undefined;
  const tasks: MissionTask[] = useMemo(() => (groupId ? (g?.tasks ?? []) : groups.flatMap(x => x.tasks).sort((a, b) => Number(a.done) - Number(b.done) || (RANK[a.level ?? ''] ?? 3) - (RANK[b.level ?? ''] ?? 3))), [groups, g, groupId]);
  const c = countsOf(tasks);
  const toggle = (t: MissionTask, on: boolean) => api.run((w, cx) => (t.kind === 'task' ? setTaskDone(w, cx, t.id, on) : setCaptureDone(w, cx, t.id, on)));
  const title = groupId ? (g?.name ?? 'Group not found') : 'All tasks';
  return (
    <div className="t-page">
      <MobileTopline />
      <button type="button" className="back-link" onClick={() => go('focus')}><Icon name="chevron-left" /> Groups</button>
      <div className="mission-heading"><h1>{title}</h1><p className="mission-sub">{groupId && !g ? 'This group no longer exists.' : <>{c.total} open {c.total === 1 ? 'task' : 'tasks'}{labels && c.total > 0 && <PriorityCounts {...c} />}</>}</p></div>
      {g && <div className="t-actions">
        {g.kind === 'suggested' && <button className="primary-button" onClick={() => api.run((w, cx) => groupCaptures(w, cx, { ids: g.captureIds, name: g.name, deps: assistState.deps.filter(d => g.captureIds.includes(d.before) && g.captureIds.includes(d.after)) }))}>Group these</button>}
        {g.kind === 'outcome' && <><button className="quiet-button" onClick={() => modal({ kind: 'outcomeEdit', id: g.outcomeId! })}>Edit group</button><button className="primary-button" onClick={() => modal({ kind: 'taskNew', outcomeId: g.outcomeId })}>Add task</button></>}
        {g.kind === 'rest' && <button className="primary-button" onClick={() => modal({ kind: 'taskNew', outcomeId: null })}>Add task</button>}
      </div>}
      {g?.kind === 'suggested' && assistState.deps.filter(d => g.captureIds.includes(d.before) && g.captureIds.includes(d.after)).map(d => <p className="small-note" key={`${d.before}:${d.after}`}>May depend on: “{assistState.texts[d.after]}” after “{assistState.texts[d.before]}”{d.why ? ` — ${d.why}` : ''}</p>)}
      <AssistBanner a={assistState} onSettings={() => modal({ kind: 'settings' })} hasAi />
      {labels ? SECTIONS.map(sec => { const rows = tasks.filter(t => !t.done && (t.level ?? 'none') === sec.key); return rows.length ? (
        <section key={sec.key} className="t-sec" aria-label={sec.label}><h2><span className={`dotc prio-${sec.key}`} aria-hidden="true" />{sec.label}<span className="t-n">{rows.length}</span></h2>
          <ul className="t-list">{rows.map(t => <TaskRow key={t.key} t={t} labels={labels} toggle={toggle} />)}</ul></section>) : null; })
        : (tasks.some(t => !t.done) && <section className="t-sec"><ul className="t-list">{tasks.filter(t => !t.done).map(t => <TaskRow key={t.key} t={t} labels={labels} toggle={toggle} />)}</ul></section>)}
      {!tasks.some(t => !t.done) && <p className="small-note">{tasks.length ? 'Everything here is done.' : 'Nothing here.'}</p>}
      {tasks.some(t => t.done) && <details className="t-done"><summary>Done ({tasks.filter(t => t.done).length})</summary><ul className="t-list">{tasks.filter(t => t.done).map(t => <TaskRow key={t.key} t={t} labels={labels} toggle={toggle} />)}</ul></details>}
    </div>
  );
}
