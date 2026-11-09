import { useMemo, useState } from 'react';
import { activity, type Line } from '../../src/domain/activity';
import { useApp } from '../app/context';
import { MobileTopline } from '../app/Heading';
import { Icon } from '../ui/Icon';

const day = (iso: string): string => {
  const d = new Date(iso), t = new Date(), y = new Date(t.getTime() - 86400000), same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  return same(d, t) ? 'Today' : same(d, y) ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
};
const time = (iso: string): string => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** AI Assistant: a plain log of what the AI did and how you answered it. It never changes anything on this screen. */
export function Activity() {
  const { api } = useApp();
  const lines = useMemo(() => activity(api.ws), [api.ws]);
  const [limit, setLimit] = useState(60);
  const shown = lines.slice(0, limit), days: { label: string; rows: Line[] }[] = [];
  for (const l of shown) { const label = day(l.at), last = days[days.length - 1]; if (last && last.label === label) last.rows.push(l); else days.push({ label, rows: [l] }); }
  return (
    <>
      <MobileTopline />
      <div className="mission-heading"><h1>AI Assistant</h1><p className="mission-sub">What the AI has done</p></div>
      {days.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="sparkles" /></span><h2>Nothing yet</h2><p>When the AI prepares help, suggests a group or a priority, it shows up here.</p></div> :
        days.map(d => (
          <section key={d.label} className="act-day" aria-label={d.label}><h2 className="mission-other-heading">{d.label}</h2>
            <ul className="act-list">{d.rows.map(l => (
              <li key={l.id} className="act-row"><span className={`act-ic ${l.by}`} aria-hidden="true"><Icon name={l.icon} /></span><span className="act-body"><span className="act-text">{l.text}</span><span className="act-time">{time(l.at)}</span></span></li>))}</ul>
          </section>))}
      {lines.length > limit && <div className="inbox-footer"><button className="quiet-button" onClick={() => setLimit(n => n + 60)}>Show more ({lines.length - limit})</button></div>}
    </>
  );
}
