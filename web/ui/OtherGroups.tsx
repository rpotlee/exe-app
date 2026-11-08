import { useMemo, useState } from 'react';
import { groupCaptures, selectCurrentFocus, setCaptureDone, setTaskDone } from '../../src/domain/commands';
import { countsOf, missionGroups, type MissionGroup, type MissionTask } from '../../src/domain/mission';
import { useApp } from '../app/context';
import { Icon } from './Icon';
import { PriorityCounts, PriorityDot } from './PriorityDot';

function Row({ t, labels }: { t: MissionTask; labels: boolean }) {
  const { api } = useApp();
  const toggle = (on: boolean) => api.run((w, c) => (t.kind === 'task' ? setTaskDone(w, c, t.id, on) : setCaptureDone(w, c, t.id, on)));
  return (
    <li className={`g-task ${t.done ? 'is-complete' : ''}`}>
      <label className="raw-check"><input type="checkbox" checked={t.done} aria-label={`${t.done ? 'Reopen' : 'Complete'} ${t.text}`} onChange={e => toggle(e.target.checked)} /><span className="raw-text">{t.text}</span></label>
      {labels && t.captureId && <PriorityDot captureId={t.captureId} level={t.level} fromAi={t.fromAi} why={t.why} text={t.text} />}
    </li>
  );
}

function Card({ g, labels, open, toggle }: { g: MissionGroup; labels: boolean; open: boolean; toggle: () => void }) {
  const { api, modal, assistState } = useApp();
  const n = countsOf(g.tasks), sub = g.kind === 'suggested' ? 'Suggested by AI' : g.lane ? g.lane[0]?.toUpperCase() + g.lane.slice(1) : '';
  return (
    <div className={`g-card ${open ? 'open' : ''}`}>
      <button type="button" className="priority-mini g-head" aria-expanded={open} onClick={toggle}>
        <span className="mini-icon"><Icon name={g.kind === 'rest' ? 'list-checks' : g.kind === 'suggested' ? 'sparkles' : 'layers'} /></span>
        <span className="mini-copy"><strong className="mini-title">{g.name}</strong>
          <span className="mini-kicker g-meta">{sub && <>{sub} · </>}{n.total} {n.total === 1 ? 'item' : 'items'}{labels && n.total > 0 && <PriorityCounts {...n} />}</span></span>
        <Icon name="chevron-down" className="g-chev" />
      </button>
      {open && <div className="g-body">
        <ul className="g-tasks">{g.tasks.map(t => <Row key={t.key} t={t} labels={labels} />)}{!g.tasks.length && <li className="small-note">No steps yet.</li>}</ul>
        <div className="g-actions">
          {g.kind === 'outcome' && g.lane === 'now' && g.outcomeId && <button className="mini-button" onClick={() => api.run((w, c) => selectCurrentFocus(w, c, g.outcomeId as string))}>Make current</button>}
          {g.kind === 'outcome' && g.outcomeId && <button className="mini-button" onClick={() => modal({ kind: 'focusMode', id: g.outcomeId as string })}>Focus Mode</button>}
          {g.kind === 'suggested' && <button className="primary-button" onClick={() => api.run((w, c) => groupCaptures(w, c, { ids: g.captureIds, name: g.name, deps: assistState.deps.filter(d => g.captureIds.includes(d.before) && g.captureIds.includes(d.after)) }))}>Group these</button>}
        </div>
      </div>}
    </div>
  );
}

/** Every group except the current priority, each with its item count and how many of each priority. Tap a group to see its tasks. */
export function OtherGroups({ currentId }: { currentId: string | null }) {
  const { api, scope, assistState, priorityMode } = useApp();
  const hints = useMemo(() => ({ priorities: assistState.prios, groups: assistState.groups.map(g => ({ name: g.name, ids: g.ids })) }), [assistState.prios, assistState.groups]);
  const groups = useMemo(() => missionGroups(api.ws, scope, hints, priorityMode).filter(g => g.outcomeId === null || g.outcomeId !== currentId), [api.ws, scope, hints, priorityMode, currentId]);
  const [open, setOpen] = useState<string | null>(null);
  if (!groups.length) return null;
  const labels = priorityMode !== 'off';
  return (
    <section className="mission-other" aria-label="Other groups"><div className="mission-other-head"><div className="mission-other-heading">Other groups</div></div>
      <div className="side-priorities">{groups.map(g => <Card key={g.id} g={g} labels={labels} open={open === g.id} toggle={() => setOpen(o => (o === g.id ? null : g.id))} />)}</div></section>
  );
}
