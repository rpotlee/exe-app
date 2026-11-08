import { useState } from 'react';
import { addCaptures, archiveCapture, convertKind, fileCapture, groupCaptures, setCaptureDone, setCapturePriority } from '../../src/domain/commands';
import { executables, kindCounts, kindOf, type CaptureKind, type KindFilter } from '../../src/domain/scope';
import { useAssist } from '../app/useAssist';
import { useApp } from '../app/context';
import { PageHeading } from '../app/Heading';
import type { AssistItem } from '../app/ai';
import { Icon } from '../ui/Icon';

const niceDate = (iso: string) => { try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch { return ''; } };
const KIND_LABEL: Record<KindFilter, string> = { everything: 'Everything', todo: 'To-dos', note: 'Notes', reminder: 'Reminders' };
type Status = 'all' | 'active' | 'done';

/** List: everything captured, as To-dos, Notes and Reminders, for All or one folder. It works with no AI at all.
 *  A type filter is only a view. Checking a to-do changes nothing else. */
export function Inbox() {
  const { api, modal, assist: assistClient, scope } = useApp();
  const ws = api.ws, assist = useAssist(assistClient, ws);
  const scopeName = scope.kind === 'folder' ? (ws.folders.find(f => f.id === scope.id)?.name ?? 'All') : 'All';
  const [kind, setKind] = useState<KindFilter>(() => (sessionStorage.getItem('exe-kind-filter') as KindFilter | null) ?? 'everything');
  const [status, setStatus] = useState<Status>(() => (sessionStorage.getItem('exe-todo-status') as Status | null) ?? 'all');
  const [archived, setArchived] = useState(false), [open, setOpen] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false), [draft, setDraft] = useState(''), [addKind, setAddKind] = useState<'todo' | 'note'>('todo'), [limit, setLimit] = useState(200);   // very long lists are shown 200 at a time
  const remember = (k: string, v: string) => { try { sessionStorage.setItem(k, v); } catch { /* convenience only */ } };
  const pickKind = (k: KindFilter) => { setKind(k); remember('exe-kind-filter', k); if (k === 'note') setAddKind('note'); else if (k === 'todo') setAddKind('todo'); };
  const pickStatus = (v: Status) => { setStatus(v); remember('exe-todo-status', v); };
  const counts = kindCounts(ws, scope);
  let entries = executables(ws, scope, kind, { archived });
  if (kind === 'todo' && !archived && status !== 'all') entries = entries.filter(c => (status === 'done' ? c.completed_at : !c.completed_at));
  const live = counts.everything;
  const toggle = (id: string) => setOpen(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const submit = (e: React.FormEvent) => { e.preventDefault(); const box = (e.currentTarget as HTMLFormElement).querySelector('textarea'); if (api.run((w, c) => addCaptures(w, c, draft, 'List', { kind: addKind, folderId: scope.kind === 'folder' ? scope.id : null }))) { setDraft(''); setArchived(false); if (box) box.style.height = ''; } };

  return (
    <>
      <PageHeading label={scopeName.toUpperCase()} title="List" sub={archived ? `${entries.length} archived` : live ? `${live} ${live === 1 ? 'entry' : 'entries'}` : 'Type something and save it'} />
      <section className="raw-inbox" aria-label="List">
        <AssistBanner a={assist} onSettings={() => modal({ kind: 'settings' })} hasAi={!!assistClient} />
        <Suggestions a={assist} apply={g => api.run((w, c) => groupCaptures(w, c, { ids: g.ids, name: g.name, deps: assist.deps.filter(d => g.ids.includes(d.before) && g.ids.includes(d.after)) }))} />
        <div className="seg" role="group" aria-label="Show">{(['everything', 'todo', 'note', 'reminder'] as const).map(k => (
          <button key={k} aria-pressed={kind === k} aria-label={`${KIND_LABEL[k]}, ${counts[k]}`} onClick={() => pickKind(k)}>{KIND_LABEL[k]}<span className="seg-n" aria-hidden="true">{counts[k]}</span></button>))}</div>
        {kind === 'todo' && <div className="seg sub" role="group" aria-label="To-do status">{(['all', 'active', 'done'] as const).map(v => (
          <button key={v} aria-pressed={status === v} onClick={() => pickStatus(v)}>{v[0]?.toUpperCase()}{v.slice(1)}</button>))}</div>}
        <form className="add-row" onSubmit={submit}>
          <div className="kind-menu-wrap">
            <button type="button" className="add-kind" aria-haspopup="menu" aria-expanded={menuOpen} aria-label={`Adding a ${addKind === 'note' ? 'note' : 'to-do'}. Change type`} onClick={() => setMenuOpen(o => !o)}>{addKind === 'note' ? 'Note' : 'To-do'}<Icon name="chevron-down" /></button>
            {menuOpen && <ul className="kind-menu" role="menu" onKeyDown={e => { if (e.key === 'Escape') setMenuOpen(false); }}>
              <li role="none"><button role="menuitemradio" aria-checked={addKind === 'todo'} onClick={() => { setAddKind('todo'); setMenuOpen(false); }}><Icon name="circle-check" /><span>To-do<small>A task with a checkbox</small></span></button></li>
              <li role="none"><button role="menuitemradio" aria-checked={addKind === 'note'} onClick={() => { setAddKind('note'); setMenuOpen(false); }}><Icon name="file-text" /><span>Note<small>A thought or some info</small></span></button></li>
              <li role="none"><button role="menuitemradio" aria-checked="false" disabled><Icon name="bell" /><span>Reminder<small>Needs a date; coming soon</small></span></button></li>
            </ul>}
          </div>
          <textarea className="text-input" aria-label={addKind === 'note' ? 'Add a note' : 'Add a to-do'} placeholder={addKind === 'note' ? 'Write a note…' : 'Add a to-do or paste a list'} rows={1} maxLength={20000} value={draft}
            onChange={e => { setDraft(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'; }}
            onKeyDown={e => { if (addKind === 'todo' && e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (draft.trim()) e.currentTarget.form?.requestSubmit(); } }} />
          <button className="add-submit" type="submit" disabled={!draft.trim()} aria-label={addKind === 'note' ? 'Add note' : 'Add to-do'}><Icon name="arrow-up" /></button></form>
        <ul className="raw-list grouped">
          {entries.slice(0, limit).map(c => { const text = c.edited_text ?? c.text, isOpen = open.has(c.id), k = kindOf(c); return (
            <li key={c.id} className={`raw-row kind-${k} ${c.completed_at ? 'is-complete' : ''}`}>
              {k === 'todo' ? <label className="raw-check"><input type="checkbox" checked={!!c.completed_at} aria-label={`${c.completed_at ? 'Reopen' : 'Complete'} ${text}`} onChange={e => api.run((w, cx) => setCaptureDone(w, cx, c.id, e.target.checked))} /><span className="raw-text">{text}{c.user_priority && <span className={`pill prio prio-${c.user_priority}`}>{c.user_priority}</span>}</span></label>
                : <div className="raw-check kind-body"><Icon name={k === 'note' ? 'file-text' : 'bell'} className="kind-icon" /><span className={`raw-text ${k === 'note' ? 'note-preview' : ''}`}>{text}</span>{k === 'reminder' && <span className="pill">Not scheduled</span>}</div>}
              <button className="raw-more" aria-label={`More actions for ${text}`} aria-expanded={isOpen} aria-controls={`capture-details-${c.id}`} onClick={() => toggle(c.id)}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg></button>
              <div className="raw-detail-panel" id={`capture-details-${c.id}`} hidden={!isOpen}>
                <p className="raw-meta">{niceDate(c.created_at)} · {k === 'todo' ? 'To-do' : k === 'note' ? 'Note' : 'Reminder'} · {c.folder_id ? `Folder: ${ws.folders.find(f => f.id === c.folder_id)?.name ?? 'Unfiled'}` : 'Unfiled'}{c.completed_at ? ` · Done ${niceDate(c.completed_at)}` : ''}</p>
                {c.edited_text && c.edited_text !== c.text && <p className="raw-original"><strong>Original capture</strong><br />{c.text}</p>}
                <div className="detail-fields">
                  <label className="file-field"><span className="small-note">Type</span><select className="select" aria-label={`Type: ${text}`} value={k} onChange={e => api.run(w => convertKind(w, c.id, e.target.value as CaptureKind))}><option value="todo">To-do</option><option value="note">Note</option><option value="reminder" disabled>Reminder (needs a date; coming soon)</option></select></label>
                  <label className="file-field"><span className="small-note">Folder</span><select className="select" aria-label={`Move to folder: ${text}`} value={c.folder_id ?? ''} onChange={e => api.run(w => fileCapture(w, c.id, e.target.value || null))}><option value="">Unfiled</option>{ws.folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
                  {k === 'todo' && <label className="file-field"><span className="small-note">Priority</span><select className="select" aria-label={`Priority: ${text}`} value={c.user_priority ?? ''} onChange={e => api.run(w => setCapturePriority(w, c.id, (e.target.value || null) as 'high' | 'medium' | 'low' | null))}><option value="">None</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>}
                </div>
                <div className="raw-actions"><button className="mini-button" onClick={() => modal({ kind: 'captureEdit', id: c.id })}>Edit</button>
                  <button className="mini-button" onClick={() => api.run((w, cx) => archiveCapture(w, cx, c.id, !c.archived_at))}>{c.archived_at ? 'Restore' : 'Archive'}</button></div>
              </div>
              <Help item={assist.items[c.id]} text={text} />
            </li>); })}
          {!entries.length && (live || archived) ? <li className="empty-state">{archived ? 'Nothing archived.' : `No ${kind === 'everything' ? 'entries' : KIND_LABEL[kind].toLowerCase()} here${scope.kind === 'folder' ? ` in ${scopeName}` : ''}.`}</li> : null}
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
