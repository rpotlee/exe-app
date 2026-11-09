import { useMemo } from 'react';
import { countsOf, missionGroups, type MissionTask } from '../../src/domain/mission';
import { setCaptureDone, setTaskDone } from '../../src/domain/commands';
import { useApp } from '../app/context';
import { MobileTopline } from '../app/Heading';
import { Icon } from '../ui/Icon';
import { PriorityCounts, PriorityDot } from '../ui/PriorityDot';

const RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/** Status (owner direction, DEC-017): an "All tasks" card (the top few, high priority first) and your groups below it. */
export function Mission() {
  const { api, scope, assistState, priorityMode, go } = useApp();
  const ws = api.ws, labels = priorityMode !== 'off';
  const hints = useMemo(() => ({ priorities: assistState.prios, groups: assistState.groups.map(g => ({ name: g.name, ids: g.ids })) }), [assistState.prios, assistState.groups]);
  const groups = useMemo(() => missionGroups(ws, scope, hints, priorityMode), [ws, scope, hints, priorityMode]);
  const all = useMemo(() => groups.flatMap(g => g.tasks).sort((a, b) => Number(a.done) - Number(b.done) || (RANK[a.level ?? ''] ?? 3) - (RANK[b.level ?? ''] ?? 3)), [groups]);   // open work first; completed stays visible for undo
  const open = all.filter(t => !t.done), n = countsOf(open), show = typeof matchMedia === 'function' && matchMedia('(min-width: 761px)').matches ? 5 : 3, shown = all.slice(0, show);
  const scopeName = scope.kind === 'folder' ? (ws.folders.find(f => f.id === scope.id)?.name ?? 'All') : 'All';
  const toggle = (t: MissionTask, on: boolean) => api.run((w, c) => (t.kind === 'task' ? setTaskDone(w, c, t.id, on) : setCaptureDone(w, c, t.id, on)));
  const openGroup = (id: string) => { location.hash = `#/group/${encodeURIComponent(id)}`; window.scrollTo({ top: 0 }); };
  return (
    <>
      <MobileTopline />
      <div className="mission-heading"><div className="eyebrow mission-eyebrow">{scopeName.toUpperCase()}</div><h1>Status</h1></div>
      {groups.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="list-checks" /></span><h2>Nothing to work on yet</h2><p>Add a task to your list and it shows up here.</p><div className="button-row"><button className="primary-button" onClick={() => go('inbox')}>Open List</button></div></div> : <>
        <div className="hero-stack"><section className="priority-hero all-tasks" aria-labelledby="all-tasks-title">
          <div className="hero-head"><div className="hero-heading"><div className="hero-copy"><div className="overline">ALL TASKS</div><h2 id="all-tasks-title">{n.total} open {n.total === 1 ? 'task' : 'tasks'}</h2>
            <div className="type-label m-counts">{labels && n.total > 0 ? <PriorityCounts {...n} /> : `${groups.length} ${groups.length === 1 ? 'group' : 'groups'}`}</div></div></div></div>
          <div className="hero-checks" role="list">{shown.map(t => (
            <label key={t.key} className={`check-row ${t.done ? 'is-complete' : ''}`} role="listitem"><input type="checkbox" checked={t.done} aria-label={`${t.done ? 'Reopen' : 'Complete'} ${t.text}`} onChange={e => toggle(t, e.target.checked)} /><span>{t.text}</span>
              {labels && t.captureId && <PriorityDot captureId={t.captureId} level={t.level} fromAi={t.fromAi} why={t.why} text={t.text} />}</label>))}
            {!open.length && <p className="small-note">Everything is done.</p>}</div>
          {all.length > shown.length && <p className="m-more">{all.length - shown.length} more</p>}
          <div className="hero-bottom"><button className="primary-button" onClick={() => go('tasks')}>View all tasks</button></div>
        </section></div>
        <section className="mission-other" aria-label="Groups"><div className="mission-other-head"><div className="mission-other-heading">Groups</div></div>
          <div className="side-priorities">{groups.map(g => { const c = countsOf(g.tasks), tag = g.kind === 'suggested' ? 'Suggested by AI' : ''; return (
            <button key={g.id} type="button" className="priority-mini g-head" onClick={() => openGroup(g.id)}>
              <span className="mini-icon"><Icon name={g.kind === 'rest' ? 'list-checks' : g.kind === 'suggested' ? 'sparkles' : 'layers'} /></span>
              <span className="mini-copy"><strong className="mini-title">{g.name}</strong><span className="mini-kicker g-meta">{tag && <>{tag} · </>}{c.total} {c.total === 1 ? 'item' : 'items'}{labels && c.total > 0 && <PriorityCounts {...c} />}</span></span>
              <Icon name="chevron-right" className="mini-arrow" /></button>); })}</div></section>
      </>}
    </>
  );
}
