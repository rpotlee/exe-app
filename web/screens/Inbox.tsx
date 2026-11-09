import { useState } from 'react';
import { addCaptures, archiveCapture, convertKind, fileCapture, reminderChoices, setCaptureDone, setCapturePriority, setReminder } from '../../src/domain/commands';
import { executables, kindCounts, kindOf, type CaptureKind, type KindFilter } from '../../src/domain/scope';
import { PriorityDot } from '../ui/PriorityDot';
import { labelFor } from '../../src/domain/mission';
import { useApp } from '../app/context';
import { PageHeading } from '../app/Heading';
import { Icon } from '../ui/Icon';
import { AskExe, HelpChip, HelpPanel } from '../ui/HelpPanel';

const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const niceWhen = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const compactWhen = (iso: string) => {
  const date = new Date(iso), now = new Date(), tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const day = date.toDateString() === now.toDateString() ? 'Today' : date.toDateString() === tomorrow.toDateString() ? 'Tomorrow' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' as const } : {}) });
  return `${day} · ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
};
const niceDate = (iso: string) => { try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch { return ''; } };
const KIND_LABEL: Record<KindFilter, string> = { everything: 'All', todo: 'Tasks', note: 'Notes', reminder: 'Reminders' };

/** List: everything captured, as Tasks, Notes and Reminders, for All or one folder. It works with no AI at all.
 *  A type filter is only a view. Checking a task changes nothing else. */
export function List() {
  const { api, modal, scope, assistState, priorityMode } = useApp();
  const ws = api.ws;
  const scopeName = scope.kind === 'folder' ? (ws.folders.find(f => f.id === scope.id)?.name ?? 'All') : 'All';
  const [kind, setKind] = useState<KindFilter>(() => (sessionStorage.getItem('exe-kind-filter') as KindFilter | null) ?? 'everything');
  const [archived, setArchived] = useState(false), [open, setOpen] = useState<Set<string>>(new Set()), [helpOpen, setHelpOpen] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false), [draft, setDraft] = useState(''), [addKind, setAddKind] = useState<'todo' | 'note' | 'reminder'>('todo'), [when, setWhen] = useState(''), [limit, setLimit] = useState(200);   // very long lists are shown 200 at a time
  const remember = (k: string, v: string) => { try { sessionStorage.setItem(k, v); } catch { /* convenience only */ } };
  const pickKind = (k: KindFilter) => { setKind(k); remember('exe-kind-filter', k); if (k === 'note') setAddKind('note'); else if (k === 'todo') setAddKind('todo'); };
  const counts = kindCounts(ws, scope);
  // One filter bar: open entries first; finished tasks wait in a collapsible Done section at the bottom (owner, 2026-11-09)
  const all = executables(ws, scope, kind, { archived });
  const entries = archived ? all : all.filter(c => !(kindOf(c) === 'todo' && c.completed_at));
  const done = archived ? [] : all.filter(c => kindOf(c) === 'todo' && c.completed_at);
  const live = counts.everything;
  const toggle = (id: string) => setOpen(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const submit = (e: React.FormEvent) => { e.preventDefault(); const box = (e.currentTarget as HTMLFormElement).querySelector('textarea'); if (addKind === 'reminder' && !when) return; if (api.run((w, c) => addCaptures(w, c, draft, 'List', { kind: addKind, folderId: scope.kind === 'folder' ? scope.id : null, remindAt: addKind === 'reminder' ? new Date(when).toISOString() : null }))) { setDraft(''); setWhen(''); setArchived(false); if (box) box.style.height = ''; } };

  const row = (c: typeof all[number]) => { const text = c.edited_text ?? c.text, isOpen = open.has(c.id), k = kindOf(c); return (
            <li key={c.id} className={`raw-row kind-${k} ${c.completed_at ? 'is-complete' : ''}`}>
              {k === 'todo' ? <label className="raw-check"><input type="checkbox" checked={!!c.completed_at} aria-label={`${c.completed_at ? 'Reopen' : 'Complete'} ${text}`} onChange={e => api.run((w, cx) => setCaptureDone(w, cx, c.id, e.target.checked))} /><span className="raw-text">{text}</span>{priorityMode !== 'off' && (() => { const lb = labelFor(c, { priorities: assistState.prios, groups: [] }, priorityMode); return (lb.level || priorityMode === 'ai') ? <PriorityDot captureId={c.id} level={lb.level} fromAi={lb.fromAi} why={lb.why} text={text} /> : null; })()}</label>
                : <div className="raw-check kind-body"><Icon name={k === 'note' ? 'file-text' : 'bell'} mobileName={k === 'note' ? 'mobile-note' : 'mobile-bell'} className="kind-icon" /><span className={`raw-text ${k === 'note' ? 'note-preview' : ''}`}>{text}</span>{c.remind_at && <span className={`pill ${!c.remind_done_at && Date.parse(c.remind_at) <= Date.now() ? 'pill-due' : ''}`}>{c.remind_done_at ? 'Dismissed' : <time dateTime={c.remind_at} title={niceWhen(c.remind_at)}><span className="reminder-date-wide">{niceWhen(c.remind_at)}</span><span className="reminder-date-compact">{compactWhen(c.remind_at)}</span></time>}</span>}{k === 'reminder' && !c.remind_at && <span className="pill">No time set</span>}</div>}
              {!c.completed_at && !c.archived_at && <HelpChip id={c.id} open={helpOpen === c.id} onToggle={() => setHelpOpen(o => (o === c.id ? null : c.id))} />}
              <button className="raw-more" aria-label={`More actions for ${text}`} aria-expanded={isOpen} aria-controls={`capture-details-${c.id}`} onClick={() => toggle(c.id)}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg></button>
              <div className="raw-detail-panel" id={`capture-details-${c.id}`} hidden={!isOpen}>
                <p className="raw-meta">{niceDate(c.created_at)} · {k === 'todo' ? 'Task' : k === 'note' ? 'Note' : 'Reminder'} · {c.folder_id ? `Folder: ${ws.folders.find(f => f.id === c.folder_id)?.name ?? 'Unfiled'}` : 'Unfiled'}{c.completed_at ? ` · Done ${niceDate(c.completed_at)}` : ''}</p>
                {c.edited_text && c.edited_text !== c.text && <p className="raw-original"><strong>Original capture</strong><br />{c.text}</p>}
                <div className="detail-fields">
                  <label className="file-field"><span className="small-note">Type</span><select className="select" aria-label={`Type: ${text}`} value={k} onChange={e => api.run(w => convertKind(w, c.id, e.target.value as CaptureKind))}><option value="todo">Task</option><option value="note">Note</option><option value="reminder">Reminder</option></select></label>
                  <label className="file-field"><span className="small-note">Folder</span><select className="select" aria-label={`Move to folder: ${text}`} value={c.folder_id ?? ''} onChange={e => api.run(w => fileCapture(w, c.id, e.target.value || null))}><option value="">Unfiled</option>{ws.folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
                  {k !== 'note' && <label className="file-field"><span className="small-note">Remind me</span><select className="select" aria-label={`Remind me: ${text}`} value="" onChange={e => { const v = e.target.value; if (v === 'clear') api.run((w, cx) => setReminder(w, cx, c.id, null)); else if (v) api.run((w, cx) => setReminder(w, cx, c.id, v)); }}><option value="">{c.remind_at ? niceWhen(c.remind_at) : 'Not set'}</option>{reminderChoices(new Date()).map(ch => <option key={ch.label} value={ch.at.toISOString()}>{ch.label}</option>)}{c.remind_at && <option value="clear">Remove reminder</option>}</select></label>}
                  {k === 'todo' && <label className="file-field"><span className="small-note">Priority</span><select className="select" aria-label={`Priority: ${text}`} value={c.user_priority ?? ''} onChange={e => api.run((w, cx) => setCapturePriority(w, cx, c.id, (e.target.value || null) as 'high' | 'medium' | 'low' | null))}><option value="">None</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>}
                </div>
                <div className="raw-actions">{!c.completed_at && !c.archived_at && <AskExe id={c.id} onAsked={() => setHelpOpen(c.id)} />}<button className="mini-button" onClick={() => modal({ kind: 'captureEdit', id: c.id })}>Edit</button>
                  <button className="mini-button" onClick={() => api.run((w, cx) => archiveCapture(w, cx, c.id, !c.archived_at))}>{c.archived_at ? 'Restore' : 'Archive'}</button></div>
              </div>
              {helpOpen === c.id && <HelpPanel id={c.id} text={text} />}
            </li>); };

  return (
    <>
      <PageHeading label={scopeName.toUpperCase()} title="List" sub={archived ? `${entries.length} archived` : live ? `${live} ${live === 1 ? 'entry' : 'entries'}` : 'Type something and save it'} />
      <section className="raw-inbox" aria-label="List">
        <div className="seg" role="group" aria-label="Show">{(['everything', 'todo', 'note', 'reminder'] as const).map(k => (
          <button key={k} aria-pressed={kind === k} aria-label={`${KIND_LABEL[k]}, ${counts[k]}`} onClick={() => pickKind(k)}>{KIND_LABEL[k]}<span className="seg-n" aria-hidden="true">{counts[k]}</span></button>))}</div>
        <form className="add-row" onSubmit={submit}>
          <div className="kind-menu-wrap">
            <button type="button" className="add-kind" aria-haspopup="menu" aria-expanded={menuOpen} aria-label={`Adding a ${addKind === 'todo' ? 'task' : addKind}. Change type`} onClick={() => setMenuOpen(o => !o)}>{addKind === 'note' ? 'Note' : addKind === 'reminder' ? 'Reminder' : 'Task'}<Icon name="chevron-down" /></button>
            {menuOpen && <ul className="kind-menu" role="menu" onKeyDown={e => { if (e.key === 'Escape') setMenuOpen(false); }}>
              <li role="none"><button role="menuitemradio" aria-checked={addKind === 'todo'} onClick={() => { setAddKind('todo'); setMenuOpen(false); }}><Icon name="circle-check" /><span>Task<small>Something to do, with a checkbox</small></span></button></li>
              <li role="none"><button role="menuitemradio" aria-checked={addKind === 'note'} onClick={() => { setAddKind('note'); setMenuOpen(false); }}><Icon name="file-text" /><span>Note<small>A thought or some info</small></span></button></li>
              <li role="none"><button role="menuitemradio" aria-checked={addKind === 'reminder'} onClick={() => { setAddKind('reminder'); setMenuOpen(false); }}><Icon name="bell" /><span>Reminder<small>Shows up in the app when it is due</small></span></button></li>
            </ul>}
          </div>
          <textarea className="text-input" aria-label={addKind === 'note' ? 'Add a note' : addKind === 'reminder' ? 'Add a reminder' : 'Add a task'} placeholder={addKind === 'note' ? 'Write a note…' : addKind === 'reminder' ? 'Add a reminder…' : 'Add a task…'} rows={1} maxLength={20000} value={draft}
            onChange={e => { setDraft(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'; }}
            onKeyDown={e => { if (addKind === 'todo' && e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (draft.trim()) e.currentTarget.form?.requestSubmit(); } }} />
          <button className="add-submit" type="submit" disabled={!draft.trim() || (addKind === 'reminder' && !when)} aria-label={addKind === 'note' ? 'Add note' : addKind === 'reminder' ? 'Add reminder' : 'Add task'}><Icon name="arrow-up" /></button></form>
        {addKind === 'reminder' && <div className="when-row"><label className="file-field"><span className="small-note">Remind me at</span><input className="select" type="datetime-local" aria-label="Remind me at" value={when} onChange={e => setWhen(e.target.value)} /></label>
          <div className="when-quick" role="group" aria-label="Quick times">{reminderChoices(new Date()).map(ch => <button type="button" key={ch.label} className="mini-button" onClick={() => setWhen(localInput(ch.at))}>{ch.label}</button>)}</div></div>}
        <ul className="raw-list grouped">
          {entries.slice(0, limit).map(row)}
          {!entries.length && !done.length && (live || archived) ? <li className="empty-state">{archived ? 'Nothing archived.' : `No ${kind === 'everything' ? 'entries' : KIND_LABEL[kind].toLowerCase()} here${scope.kind === 'folder' ? ` in ${scopeName}` : ''}.`}</li> : null}
        </ul>
        {done.length > 0 && <details className="t-done list-done"><summary>Done ({done.length})</summary><ul className="raw-list grouped">{done.slice(0, limit).map(row)}</ul></details>}
        {entries.length > limit && <div className="inbox-footer"><button className="quiet-button" onClick={() => setLimit(n => n + 200)}>Show 200 more ({entries.length - limit} more)</button></div>}
        <div className="inbox-footer"><button className="quiet-button" aria-pressed={archived} onClick={() => setArchived(a => !a)}>{archived ? 'Back to list' : 'View archived'}</button></div>
      </section>
    </>
  );
}
