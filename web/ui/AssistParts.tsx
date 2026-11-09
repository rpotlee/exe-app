import { useState } from 'react';
import type { AssistItem } from '../app/ai';
import { Icon } from './Icon';
import type { useAssist } from '../app/useAssist';

const search = (domain: string, q: string) => `https://www.google.com/search?q=${encodeURIComponent(`site:${domain} ${q}`)}`;
const web = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;

export function AssistBanner({ a, onSettings, hasAi }: { a: ReturnType<typeof useAssist>; onSettings: () => void; hasAi: boolean }) {
  if (a.ready === false) return hasAi ? <p className="assist-note"><button className="link-button" onClick={onSettings}>Turn on AI help</button></p> : null;
  if (a.error) return <p className="assist-note" role="status">AI help paused. <button className="link-button" disabled={a.busy} onClick={a.again}>Try again</button></p>;
  return a.busy ? <p className="assist-note" role="status">Looking at your list…</p> : null;
}

/** Groups Exe noticed. Approving one makes an outcome (in Later) with those tasks as its steps; suggested order is saved as unconfirmed. */
export function Suggestions({ a, apply }: { a: ReturnType<typeof useAssist>; apply: (g: { ids: string[]; name: string }) => unknown }) {
  if (!a.groups.length) return null;
  return (<div className="assist-groups" aria-label="Suggested groups">{a.groups.map(g => { const order = a.deps.filter(d => g.ids.includes(d.before) && g.ids.includes(d.after)); return (
    <div key={g.ids.join()} className="card assist-card"><div className="overline"><Icon name="sparkles" /> RELATED WORK · SUGGESTED BY AI</div><h2>{g.name}</h2>{g.why && <p className="small-note">{g.why}</p>}
      <ul>{g.ids.map(i => <li key={i}>{a.texts[i]}</li>)}</ul>
      {order.length > 0 && <p className="small-note"><strong>May depend on:</strong> {order.map(d => `“${a.texts[d.after]}” may depend on “${a.texts[d.before]}”${d.why ? ` (${d.why})` : ''}`).join('; ')}.</p>}
      <div className="action-line"><button className="primary-button" onClick={() => apply(g)}>Group these</button><button className="mini-button" onClick={() => a.dismiss(g.ids)}>Not now</button></div></div>); })}</div>);
}

/** Help for one task, in one dropdown so the list stays tidy. It is closed until opened; the summary says what is inside. Everything is a suggestion from AI. */
export function Help({ item, text }: { item: AssistItem | undefined; text: string }) {
  const [copied, setCopied] = useState(false);
  if (!item) return null;
  const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* the text is selectable */ } };
  const parts = [item.email && 'Email draft', item.research && 'Sources', item.answer && 'Answer'].filter(Boolean).join(' · ');
  return (<details className="assist-help"><summary><Icon name="sparkles" /><span>AI help</span><span className="assist-kinds">{parts}</span><Icon name="chevron-down" className="assist-chevron" /></summary>
    <div className="assist-body">
      {item.next && <p className="assist-next"><strong>Next:</strong> {item.next}</p>}
      {item.answer && <div className="assist-answer"><p>{item.answer.text} <span className="pill">AI answer</span></p>
        <a href={item.answer.sourceDomain ? search(item.answer.sourceDomain, text) : web(text)} target="_blank" rel="noopener noreferrer">{item.answer.sourceTitle ? `Check ${item.answer.sourceTitle}` : 'Check this online'}</a></div>}
      {item.research && <ul className="assist-sources">{item.research.sources.map(r => <li key={r.domain}><a href={search(r.domain, r.query || item.research!.topic || text)} target="_blank" rel="noopener noreferrer">{r.title} <span className="small-note">({r.domain})</span></a></li>)}</ul>}
      {item.email && <div className="assist-email">{item.email.to && <p className="small-note">To: {item.email.to}</p>}<p><strong>{item.email.subject}</strong></p><pre>{item.email.body}</pre>
        <div className="action-line"><button className="mini-button" onClick={() => void copy(`${item.email!.subject}\n\n${item.email!.body}`)}>{copied ? 'Copied' : 'Copy'}</button>
          <a className="mini-button" href={`mailto:?subject=${encodeURIComponent(item.email.subject)}&body=${encodeURIComponent(item.email.body)}`}>Open in email</a></div></div>}
    </div></details>);
}
