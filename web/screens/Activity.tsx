import { useMemo, useState } from 'react';
import { activity, type Line, type Part } from '../../src/domain/activity';
import { useApp } from '../app/context';
import { MobileTopline } from '../app/Heading';

const dayLabel = (iso: string): string => new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
const timeOf = (iso: string): string => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const render = (parts: Part[]) => parts.map((p, i) => (typeof p === 'string' ? p : <span key={i} className={`tone-${p.tone}`}>{p.t}</span>));

/** Activity Log: a plain timeline of what the AI did and how you answered it, newest first. Date, who, what, time. It changes nothing. */
export function Activity() {
  const { api } = useApp();
  const lines = useMemo(() => activity(api.ws), [api.ws]);
  const [limit, setLimit] = useState(80);
  const days: { label: string; rows: Line[] }[] = [];
  for (const l of lines.slice(0, limit)) { const label = dayLabel(l.at), last = days[days.length - 1]; if (last && last.label === label) last.rows.push(l); else days.push({ label, rows: [l] }); }
  return (
    <>
      <MobileTopline />
      <div className="mission-heading"><h1>Activity Log</h1><p className="mission-sub">What the AI has done</p></div>
      {days.length === 0 ? <p className="log-empty">Nothing yet. When the AI prepares help or suggests a group or a priority, it shows up here.</p> :
        <ol className="tl">{days.map(d => (
          <li key={d.label} className="tl-day"><h2>{d.label}</h2>
            <ul className="tl-entries">{d.rows.map(l => (
              <li key={l.id} className="tl-entry"><strong className="tl-who">{l.by === 'ai' ? 'AI' : 'You'}</strong><span className="tl-what">{render(l.parts)}</span><time className="tl-time" dateTime={l.at}>{timeOf(l.at)}</time></li>))}</ul>
          </li>))}</ol>}
      {lines.length > limit && <div className="inbox-footer"><button className="quiet-button" onClick={() => setLimit(n => n + 80)}>Show more ({lines.length - limit})</button></div>}
    </>
  );
}
