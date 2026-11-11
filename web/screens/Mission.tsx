import { useEffect, useMemo, useState } from 'react';
import { scrollToTop } from '../app/scroll';
import { groupSummary, missionGroups, type MissionGroup } from '../../src/domain/mission';
import { progressOf, scheduleSummary, type ScheduledItem } from '../../src/domain/groupsOverview';
import { useApp } from '../app/context';
import { MobileTopline } from '../app/Heading';
import { Icon } from '../ui/Icon';

const ICONS = ['rocket', 'code', 'briefcase', 'layers'];
const date = (value: string | null) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString() : 'no updates yet';
function tone(g: MissionGroup, index: number) {
  if (g.kind === 'rest') return { icon: 'layers', className: 'violet' };
  const choices = ['mint', 'blue', 'amber', 'violet'];
  return { icon: ICONS[index % ICONS.length]!, className: choices[index % choices.length]! };
}
function DueList({ title, items }: { title: string; items: ScheduledItem[] }) {
  return <div className="groups-due-list" role="region" aria-label={title}>
    <strong>{title}</strong>
    {items.length ? <ul>{items.map(item => <li key={item.key}><span>{item.title}</span><time>{new Date(item.kind === 'deadline' ? item.dueAt - 1 : item.dueAt).toLocaleDateString()}</time></li>)}</ul> : <p>No {title.toLowerCase()} items.</p>}
  </div>;
}

/** Approved Outcomes and saved AI proposals use the same existing group projection. */
export function Mission() {
  const { api, scope, assistState, priorityMode, modal } = useApp();
  const ws = api.ws;
  const hints = useMemo(() => ({ priorities: assistState.prios, groups: assistState.groups.map(g => ({ name: g.name, ids: g.ids, updatedAt: g.updatedAt })) }), [assistState.prios, assistState.groups]);
  const groups = useMemo(() => missionGroups(ws, scope, hints, priorityMode), [ws, scope, hints, priorityMode]);
  const progress = useMemo(() => progressOf(groups), [groups]);
  const [now, setNow] = useState(() => Date.now());
  const [dueOpen, setDueOpen] = useState<'missed' | 'upcoming' | null>(null);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(timer); }, []);
  const schedule = useMemo(() => scheduleSummary(ws, scope, now), [ws, scope, now]);
  const openGroup = (id: string) => { location.hash = `#/group/${encodeURIComponent(id)}`; scrollToTop(); };
  const newGroup = () => modal({ kind: 'outcomeNew', folderId: scope.kind === 'folder' ? scope.id : null, asGroup: true });
  return <div className="groups-overview">
    <MobileTopline />
    <div className="groups-intro">
      <div><h1>Groups</h1><p>Organized execution.</p></div>
      <button className="groups-new" onClick={newGroup}><Icon name="plus" size={22} /> New group</button>
    </div>

    <section className="groups-overall" aria-label="Overall completion">
      <div className="groups-ring" role="img" aria-label={`${progress.percent}% completed`}>
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle className="ring-track" cx="60" cy="60" r="48" /><circle className="ring-fill" cx="60" cy="60" r="48" pathLength="100" strokeDasharray={`${progress.percent} 100`} /></svg>
        <div><strong>{progress.percent}%</strong><span>Completed</span></div>
      </div>
      <div className="groups-overall-count"><strong>{progress.remaining} of {progress.total}</strong><span>remaining</span></div>
    </section>

    <section className="groups-schedule" aria-label="Scheduled work">
      <button className="groups-schedule-tile missed" aria-expanded={dueOpen === 'missed'} onClick={() => setDueOpen(dueOpen === 'missed' ? null : 'missed')}>
        <Icon name="bell" size={22} /><strong>{schedule.missed.length} Missed</strong><Icon name="chevron-right" size={20} />
      </button>
      <button className="groups-schedule-tile upcoming" aria-expanded={dueOpen === 'upcoming'} onClick={() => setDueOpen(dueOpen === 'upcoming' ? null : 'upcoming')}>
        <Icon name="calendar-check" size={22} /><strong>{schedule.upcoming.length} Upcoming</strong><Icon name="chevron-right" size={20} />
      </button>
    </section>
    {dueOpen && <DueList title={dueOpen === 'missed' ? 'Missed' : 'Upcoming'} items={schedule[dueOpen]} />}

    <section className="groups-collection" aria-label="Your groups">
      <h2>Your groups</h2>
      <div className="groups-cards">{groups.map((g, index) => { const s = groupSummary(g), t = tone(g, index); return (
        <button key={g.id} className="groups-card" onClick={() => openGroup(g.id)} title={`Updated ${date(s.updatedAt)}`}>
          <span className={`groups-card-icon ${t.className}`}><Icon name={t.icon} size={27} /></span>
          <span className="groups-card-body"><strong>{g.name}</strong><span>{s.remaining} of {g.tasks.length} remaining</span><span className="groups-bar" aria-hidden="true"><i style={{ width: `${s.completion}%` }} /></span></span>
          <span className="groups-card-percent">{s.completion}%</span><Icon name="chevron-right" className="groups-card-chevron" size={23} />
          <span className="sr-only">Updated {date(s.updatedAt)}. {g.kind === 'suggested' ? 'Suggested by AI. ' : ''}Open group.</span>
        </button>); })}</div>
    </section>
    <button className="groups-quick-capture" onClick={() => modal({ kind: 'capture' })} aria-label="Quick capture"><Icon name="scan-line" size={24} /></button>
  </div>;
}
