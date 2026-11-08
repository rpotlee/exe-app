import { useState } from 'react';
import { addCaptures, archiveCapture, fileCapture, setCaptureDone } from '../../src/domain/commands';
import { useApp } from '../app/context';
import { PageHeading } from '../app/Heading';
import { Icon } from '../ui/Icon';

type Filter = 'all' | 'active' | 'done';
const niceDate = (iso: string) => { try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch { return ''; } };

/** The raw checklist: it works with no AI at all. Completing a to-do here changes nothing else. */
export function Inbox() {
  const { api, go, modal, awaitingReview } = useApp();
  const ws = api.ws;
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
  const toggle = (id: string) => setOpen(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <>
      <PageHeading label="CAPTURE" title="Inbox" sub={archived ? `${counts.all} archived` : `${live} to-dos`} extra={awaitingReview ? <button className="quiet-button" onClick={() => go('review')}>Review {awaitingReview} new</button> : null} />
      <section className="raw-inbox" aria-label="Raw capture checklist">
        <div className="inbox-toolbar"><div className="inbox-filters" role="group" aria-label="Filter to-dos">{(['all', 'active', 'done'] as const).map(f => (
          <button key={f} aria-pressed={filter === f} onClick={() => pick(f)}>{f[0]?.toUpperCase()}{f.slice(1)} <span className="filter-count">{counts[f]}</span></button>))}</div></div>
        <form className="inbox-add" onSubmit={e => { e.preventDefault(); if (api.run((w, c) => addCaptures(w, c, draft, 'Inbox'))) { setDraft(''); pick('all'); setArchived(false); } }}>
          <span className="add-plus" aria-hidden="true"><Icon name="plus" /></span>
          <input className="text-input" aria-label="Add a to-do" placeholder="Add a to-do…" required maxLength={4000} value={draft} onChange={e => setDraft(e.target.value)} />
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
            </li>); })}
          {!entries.length && <li className="empty-state">{scope.length ? 'No to-dos in this view.' : 'Nothing captured yet. Type a to-do above or use the Quick Capture button.'}</li>}
        </ul>
        {entries.length > limit && <div className="inbox-footer"><button className="quiet-button" onClick={() => setLimit(n => n + 200)}>Show 200 more ({entries.length - limit} more)</button></div>}
        <div className="inbox-footer"><button className="quiet-button" aria-pressed={archived} onClick={() => setArchived(a => !a)}>{archived ? 'Back to list' : 'View archived'}</button></div>
      </section>
    </>
  );
}
