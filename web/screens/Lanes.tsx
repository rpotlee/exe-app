import { setLane } from '../../src/domain/commands';
import { progressOf } from '../../src/domain/progress';
import { isOutcomeBlocked } from '../../src/domain/blocking';
import { useApp } from '../app/context';
import { PageHeading } from '../app/Heading';
import { Icon } from '../ui/Icon';

export function Lanes() {
  const { api, go, modal } = useApp();
  const ws = api.ws;
  const move = (id: string, lane: 'now' | 'next' | 'later') => {
    const r = setLane(ws, api.ctx, id, lane);
    if (!r.ok && r.needsSwap) { modal({ kind: 'swap', toId: id }); return; }
    api.run((w, c) => setLane(w, c, id, lane));
  };
  const section = (lane: 'next' | 'later', label: string, note: string) => {
    const items = ws.focus.filter(f => f.lane === lane).map(f => ws.outcomes.find(o => o.id === f.outcome_id)).filter(o => !!o);
    return (
      <section className="card lane-section" aria-label={label}>
        <div className="row-between"><h2 className="section-heading">{label}</h2><span className="pill gray">{items.length}</span></div>
        <p className="small-note">{note}</p>
        <ul className="lane-list">{items.map(o => o && (
          <li key={o.id} className="lane-item"><div className="lane-copy"><strong>{o.name}</strong><span className="lane-meta">{ws.folders.find(f => f.id === o.folder_id)?.name ?? 'Not filed'} · {progressOf(ws, o.id).label}{o.deadline ? ` · Deadline ${o.deadline}` : ''}</span>
            {isOutcomeBlocked(ws, o.id) && <span className="pill red"><Icon name="lock" /> Blocked</span>}</div>
            <div className="lane-actions"><button className="mini-button" onClick={() => move(o.id, 'now')}>Make active</button>
              <button className="mini-button" onClick={() => move(o.id, lane === 'next' ? 'later' : 'next')}>{lane === 'next' ? 'Move to Later' : 'Move to Next'}</button></div></li>))}
          {!items.length && <li className="lane-empty small-note">Nothing in {label}.</li>}</ul>
      </section>);
  };
  return (
    <>
      <PageHeading label="FOCUS BOARD" title="Next & Later" sub="Outcomes that are not active right now. Nothing moves unless you move it." extra={<div className="page-tools"><button className="quiet-button" onClick={() => go('focus')}><Icon name="arrow-left" /> Back to Focus</button></div>} />
      <div className="lanes-layout">{section('next', 'Next', 'Up after an active priority is finished or swapped out.')}{section('later', 'Later', 'Parked on purpose. Still saved.')}</div>
    </>
  );
}
