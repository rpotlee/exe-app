import { useState } from 'react';
import { addCaptures, archiveCapture, fileCapture, groupCaptures, setCaptureDone } from '../../src/domain/commands';
import { useAssist } from '../app/useAssist';
import { useApp } from '../app/context';
import { PageHeading } from '../app/Heading';
import type { AssistItem } from '../app/ai';
import { Icon } from '../ui/Icon';

type Filter = 'all' | 'active' | 'done';
const niceDate = (iso: string) => { try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch { return ''; } };

/** The raw checklist: it works with no AI at all. Completing a to-do here changes nothing else. */
export function Inbox() {
  const { api, go, modal, awaitingReview, assist: assistClient } = useApp();
  const ws = api.ws, assist = useAssist(assistClient, ws);
  const [filter, setFilter] = useState<Filter>(() => (sessionStorage.getItem('exe-inbox-filter') as Filter | null) ?? 'all');
  const [archived, setArchived] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState(''), [limit, setLimit] = useState(200);   // very long lists are shown 200 at a time
  const pick = (f: Filter) => { setFilter(f); try { sessionStorage.setItem('exe-inbox-filter', f); } catch { /* convenience only */ } };
  const scope = ws.captures.filter(c => !!c.archived_at === archived);
  const counts = { all: scope.length, active: scope.filter(c => !c.completed_at).length, done: scope.filter(c => c.completed_at).length };
  const entries = scope.filter(c => filter === 'all' || (filter === 'done' ? c.completed_at : !c.completed_at)).slice().reverse();
  if (filter === 'done') entries.sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)));
  const live = ws.captures.filter(c => !c.archived_at).length;
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (api.run((w, c) => addCaptures(w, c, draft, 'Inbox'))) { setDraft(''); pick('all'); setArchived(false); } };
  const toggle = (id: string) => setOpen(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <>
      <PageHeading label="CAPTURE" title="Inbox" sub={archived ? `${counts.all} archived` : live ? `${live} to-dos` : 'Your list starts here'} extra={awaitingReview ? <button className="quiet-button" onClick={() => go('review')}>Review {awaitingReview} new</button> : null} />
      <section className="raw-inbox" aria-label="Raw capture checklist">
        <AssistBanner a={assist} onSettings={() => modal({ kind: 'settings' })} hasAi={!!assistClient} />
        <Suggestions a={assist} apply={g => api.run((w, c) => groupCaptures(w, c, { ids: g.ids, name: g.name, deps: assist.deps.filter(d => g.ids.includes(d.before) && g.ids.includes(d.after)) }))} />
        <div className="inbox-toolbar"><div className="inbox-filters" role="group" aria-label="Filter to-dos">{(['all', 'active', 'done'] as const).map(f => (
          <button key={f} aria-pressed={filter === f} onClick={() => pick(f)}>{f[0]?.toUpperCase()}{f.slice(1)} <span className="filter-count">{counts[f]}</span></button>))}</div></div>
        <form className="inbox-add" onSubmit={submit}>
          <span className="add-plus" aria-hidden="true"><Icon name="plus" /></span>
          <textarea className="text-input" aria-label="Add a to-do" placeholder="Add a to-do, or paste a list…" required rows={1} maxLength={20000} value={draft}
            onChange={e => { setDraft(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 220) + 'px'; }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
          <button className="add-submit" type="submit" aria-label="Add to-do"><Icon name="corner-down-left" /></button></form>
        <ul className="raw-list">
          {entries.slice(0, limit).map(c => { const text = c.edited_text ?? c.text, isOpen = open.has(c.id); return (
            <li key={c.id} className={`raw-row ${c.completed_at ? 'is-complete' : ''}`}>
              <label className="raw-check"><input type="checkbox" checked={!!c.completed_at} aria-label={`${c.completed_at ? 'Reopen' : 'Complete'} ${text}`} onChange={e => api.run((w, cx) => setCaptureDone(w, cx, c.id, e.target.checked))} /><span className="raw-text">{text}</span></label>
              <button className="raw-more" aria-label={`More actions for ${text}`} aria-expanded={isOpen} aria-controls={`capture-details-${c.id}`} onClick={() => toggle(c.id)}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg></button>
              <div className="raw-detail-panel" id={`capture-details-${c.id}`} hidden={!isOpen}>
                <p className="raw-meta">{niceDate(c.created_at)} · {c.source} · {c.folder_id ? `Folder: ${ws.folders.find(f => f.id === c.folder_id)?.name ?? 'Not filed'}` : 'Not filed'} · {c.status === 'pending' ? 'Awaiting AI Review' : 'Organized'}{c.completed_at ? ' · Done' : ''}</p>
                {c.edited_text && c.edited_text !== c.text && <p className="raw-original"><strong>Original capture</strong><br />{c.text}</p>}
                <label className="file-field"><span className="small-note">File in</span><select className="select" aria-label={`File in folder: ${text}`} value={c.folder_id ?? ''} onChange={e => api.run(w => fileCapture(w, c.id, e.target.value || null))}><option value="">Not filed</option>{ws.folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
                <div className="raw-actions"><button className="mini-button" onClick={() => modal({ kind: 'captureEdit', id: c.id })}>Edit</button>
                  <button className="mini-button" onClick={() => api.run((w, cx) => archiveCapture(w, cx, c.id, !c.archived_at))}>{c.archived_at ? 'Restore' : 'Archive'}</button></div>
              </div>
              <Help item={assist.items[c.id]} text={text} />
            </li>); })}
          {!entries.length && (scope.length || live || archived) ? <li className="empty-state">{scope.length ? 'No to-dos in this view.' : 'Nothing here.'}</li> : null}
        </ul>
        {entries.length > limit && <div className="inbox-footer"><button className="quiet-button" onClick={() => setLimit(n => n + 200)}>Show 200 more ({entries.length - limit} more)</button></div>}
        <div className="inbox-footer"><button className="quiet-button" aria-pressed={archived} onClick={() => setArchived(a => !a)}>{archived ? 'Back to list' : 'View archived'}</button></div>
      </section>
    </>
  );
}

const search = (domain: string, q: string) => `https://www.google.com/search?q=${encodeURIComponent(`site:${domain} ${q}`)}`;
const web = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;

function AssistBanner({ a, onSettings, hasAi }: { a: ReturnType<typeof useAssist>; onSettings: () => void; hasAi: boolean }) {
  if (a.ready === false) return hasAi ? <p className="assist-note"><button className="link-button" onClick={onSettings}>Turn on AI help</button></p> : null;
  if (a.error) return <p className="assist-note" role="status">AI help paused. <button className="link-button" disabled={a.busy} onClick={a.again}>Try again</button></p>;
  return a.busy ? <p className="assist-note" role="status">Looking at your list…</p> : null;
}

/** Groups Exe noticed. Approving one makes an outcome (in Later) with those to-dos as its steps; suggested order is saved as unconfirmed. */
function Suggestions({ a, apply }: { a: ReturnType<typeof useAssist>; apply: (g: { ids: string[]; name: string }) => unknown }) {
  if (!a.groups.length) return null;
  return (<div className="assist-groups" aria-label="Suggested groups">{a.groups.map(g => { const order = a.deps.filter(d => g.ids.includes(d.before) && g.ids.includes(d.after)); return (
    <div key={g.ids.join()} className="card assist-card"><div className="overline"><Icon name="sparkles" /> SUGGESTED BY AI · THESE GO TOGETHER</div><h2>{g.name}</h2>{g.why && <p className="small-note">{g.why}</p>}
      <ul>{g.ids.map(i => <li key={i}>{a.texts[i]}</li>)}</ul>
      {order.length > 0 && <p className="small-note"><strong>Possible order:</strong> {order.map(d => `“${a.texts[d.before]}” first, then “${a.texts[d.after]}”${d.why ? ` (${d.why})` : ''}`).join('; ')}.</p>}
      <div className="action-line"><button className="primary-button" onClick={() => apply(g)}>Group these</button><button className="mini-button" onClick={() => a.dismiss(g.ids)}>Not now</button></div></div>); })}</div>);
}

/** Help for one to-do, in one dropdown so the list stays tidy. It is closed until opened; the summary says what is inside. Everything is a suggestion from AI. */
function Help({ item, text }: { item: AssistItem | undefined; text: string }) {
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
