import { useEffect, useState } from 'react';
import { archiveIdea, archiveTask, confirmRelationship, removeRelationship, reopenOutcome, setLane, togglePin } from '../../src/domain/commands';
import { entityName, isOutcomeBlocked } from '../../src/domain/blocking';
import { progressOf, stepsOf } from '../../src/domain/progress';
import type { Outcome, Relationship, Workspace } from '../../src/domain/model';
import { useApp } from '../app/context';
import { PageHeading } from '../app/Heading';
import { CheckRow } from '../ui/CheckRow';
import { Icon } from '../ui/Icon';

const MOBILE = '(max-width: 760px), ((pointer: coarse) and (max-height: 500px))';
function useMobile(): boolean {
  const [m, setM] = useState(() => matchMedia(MOBILE).matches);
  useEffect(() => { const q = matchMedia(MOBILE), h = () => setM(q.matches); q.addEventListener('change', h); return () => q.removeEventListener('change', h); }, []);
  return m;
}
const VERB: Record<string, string> = { blocks: 'blocks', informs: 'informs', related: 'is related to' };
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const fmt = (d: string) => { try { return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return d; } };

function RelRow({ r, ws }: { r: Relationship; ws: Workspace }) {
  const { api } = useApp();
  const sug = !r.confirmed, label = `${entityName(ws, r.from_id)} ${VERB[r.kind]} ${entityName(ws, r.to_id)}`;
  return (
    <div className={`rel-row ${sug ? 'is-suggestion' : ''}`}><span className="folder"><Icon name={r.kind === 'blocks' ? 'lock' : 'link'} /></span>
      <span className="rel-copy"><strong>{entityName(ws, r.from_id)} <em className="rel-verb">{VERB[r.kind]}</em> {entityName(ws, r.to_id)}</strong>{r.description && <small>{r.description}</small>}</span>
      <span className={`pill ${sug ? 'amber' : 'gray'}`}>{sug ? 'Suggestion' : 'Confirmed'}</span>
      <span className="rel-actions">{sug && <button className="mini-button" aria-label={`Confirm: ${label}`} onClick={() => api.run(w => confirmRelationship(w, r.id))}>Confirm</button>}
        <button className="mini-button" aria-label={`Remove: ${label}`} onClick={() => api.run(w => removeRelationship(w, r.id))}>Remove</button></span></div>
  );
}

function OutcomeBlock({ o, open, onToggle, showFolder }: { o: Outcome; open: boolean; onToggle: () => void; showFolder: boolean }) {
  const { api, modal } = useApp();
  const ws = api.ws, mobile = useMobile(), lane = o.done_at ? 'done' : ws.focus.find(f => f.outcome_id === o.id)?.lane ?? 'later';
  const steps = stepsOf(ws, o.id), archived = ws.tasks.filter(t => t.outcome_id === o.id && t.archived_at);
  const move = (to: 'now' | 'next' | 'later') => { const r = setLane(ws, api.ctx, o.id, to); if (!r.ok && r.needsSwap) modal({ kind: 'swap', toId: o.id }); else api.run((w, c) => setLane(w, c, o.id, to)); };
  const blocked = isOutcomeBlocked(ws, o.id), p = progressOf(ws, o.id);
  return (
    <article className={`outcome-block ${open ? 'open' : ''}`}>
      <div className="outcome-top" onClick={mobile ? onToggle : undefined} {...(mobile ? { role: 'button', tabIndex: 0, 'aria-expanded': open, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } } } : {})}>
        <div><h3>{o.name}</h3><p>{o.description}</p>
          {(o.pinned || o.deadline || o.effort || blocked || p.total > 0) && <p className="outcome-meta">{blocked && <span className="pill red"><Icon name="lock" /> Blocked</span>}{o.pinned && <span className="pill blue"><Icon name="check" /> Pinned</span>}
            {o.deadline && <span className="meta-chip">Deadline {fmt(o.deadline)}</span>}{o.effort && <span className="meta-chip">Effort (estimate): {o.effort}</span>}<span className="meta-chip">{p.label}</span></p>}
          {showFolder && <p className="outcome-meta"><span className="meta-chip">{ws.folders.find(f => f.id === o.folder_id)?.name ?? 'Not filed'}</span></p>}</div>
        <span className={`pill ${o.done_at ? 'green' : lane === 'now' ? 'blue' : 'gray'}`}>{o.done_at ? 'DONE' : lane.toUpperCase()}</span><Icon name="chevron-down" className="outcome-chevron" /></div>
      <div className="outcome-tasks">
        {steps.map(t => <div key={t.id} className="task-line"><CheckRow task={t} /><button className="raw-more task-edit" aria-label={`Edit step: ${t.name}`} onClick={() => modal({ kind: 'taskEdit', id: t.id })}><Icon name="edit-3" /></button></div>)}
        {!steps.length && <p className="small-note">No steps added yet.</p>}
        {archived.length > 0 && <div className="archived-steps"><span className="small-note">Archived steps (not counted in progress)</span>{archived.map(t => <div key={t.id} className="archived-step"><span>{t.name}</span>
          <button className="mini-button" aria-label={`Restore step: ${t.name}`} onClick={() => api.run((w, c) => archiveTask(w, c, t.id, false))}>Restore</button></div>)}</div>}
        <div className="action-line">
          <button className="mini-button" onClick={() => modal({ kind: 'taskNew', outcomeId: o.id })}><Icon name="plus" /> Add step</button>
          <button className="mini-button" onClick={() => modal({ kind: 'steps', outcomeId: o.id })}>Break it down</button>
          <button className="mini-button" aria-pressed={o.pinned} onClick={() => api.run(w => togglePin(w, o.id))}>{o.pinned ? 'Unpin' : 'Pin as priority'}</button>
          <button className="mini-button" onClick={() => modal({ kind: 'outcomeEdit', id: o.id })}>Edit outcome</button>
          {o.done_at ? <button className="mini-button" onClick={() => api.run((w, c) => reopenOutcome(w, c, o.id))}>Reopen outcome</button> : <button className="mini-button" onClick={() => modal({ kind: 'complete', id: o.id, prompted: false })}>Mark outcome done…</button>}
          {!o.done_at && lane !== 'now' && <button className="mini-button" onClick={() => move('now')}>Make active</button>}
          {!o.done_at && lane !== 'next' && <button className="mini-button" onClick={() => move('next')}>Move to Next</button>}
          {!o.done_at && lane !== 'later' && <button className="mini-button" onClick={() => move('later')}>Move to Later</button>}</div>
      </div>
    </article>
  );
}

export function MapScreen() {
  const { api, modal, folderSel: sel, setFolderSel: setSel } = useApp();
  const ws = api.ws, mobile = useMobile();
  const [showArchivedIdeas, setShowArchivedIdeas] = useState(false), [pickerOpen, setPickerOpen] = useState(false), [opened, setOpened] = useState<Record<string, boolean>>({});
  const folder = sel === 'all' ? null : ws.folders.find(f => f.id === sel) ?? null, isAll = !folder;
  const title = folder?.name ?? 'All notes', desc = folder ? folder.description : 'Everything across all folders, plus anything not yet filed.';
  const os = isAll ? ws.outcomes : ws.outcomes.filter(o => o.folder_id === folder.id);
  const ideas = isAll ? ws.ideas : ws.ideas.filter(i => i.folder_id === folder.id);
  const loose = isAll ? ws.tasks.filter(t => !t.outcome_id && !t.archived_at) : [];
  const caps = ws.captures.filter(c => !c.archived_at && (isAll ? !c.folder_id : c.folder_id === folder.id));
  const inFolder = (id: string) => { if (isAll) return true; const t = ws.tasks.find(x => x.id === id), x = ws.outcomes.find(o => o.id === id) ?? (t && ws.outcomes.find(o => o.id === t.outcome_id)), d = ws.decisions.find(y => y.id === id); return (x ?? d)?.folder_id === folder.id; };
  const rels = ws.relationships.filter(r => inFolder(r.from_id) || inFolder(r.to_id));
  const pickRow = (id: string) => { if (mobile && id === sel) setPickerOpen(o => !o); else { setSel(id); setPickerOpen(false); } };
  const row = (id: string, name: string, icon: string, count: number) => (
    <button key={id} className={`stream-row ${id === sel ? 'active' : ''}`} aria-current={id === sel ? 'page' : 'false'} {...(mobile && id === sel ? { 'aria-expanded': pickerOpen } : {})} onClick={() => pickRow(id)}>
      <Icon name={icon} /><span><strong>{name}</strong><small>{plural(count, 'outcome')}</small></span><Icon name="chevron-right" className="chevron" /></button>);
  return (
    <>
      <PageHeading label="MAP" title="Map" sub="Folders, outcomes, actions and decisions—without the noise." extra={<div className="page-tools"><button className="quiet-button" onClick={() => modal({ kind: 'folder', id: null })}><Icon name="plus" /> New folder</button></div>} />
      <div className="map-grid">
        <nav className={`card workstream-list ${pickerOpen ? 'open' : ''}`} data-picker aria-label="Folders">{row('all', 'All notes', 'layers', ws.outcomes.length)}{ws.folders.map(f => row(f.id, f.name, f.icon || 'folder', ws.outcomes.filter(o => o.folder_id === f.id).length))}</nav>
        <section className="card map-detail"><div className="eyebrow">{isAll ? 'EVERYTHING' : 'FOLDER'}</div><h2 className="map-title">{title}</h2><p className="small-note">{desc}</p>
          <div className="action-line"><button className="mini-button" onClick={() => modal({ kind: 'outcomeNew', folderId: folder?.id ?? null })}><Icon name="plus" /> Add outcome</button>
            {folder && <><button className="mini-button" onClick={() => modal({ kind: 'folder', id: folder.id })}>Rename</button><button className="mini-button" onClick={() => modal({ kind: 'folderDelete', id: folder.id })}>Delete folder</button></>}</div>
          <div className="divider"></div><div className="row-between"><h3 className="section-heading">Outcomes</h3><span className="pill gray">{os.length}</span></div>
          {!os.length && <p className="small-note">No outcomes here yet. Add one to start planning.</p>}
          {os.map((o, i) => <OutcomeBlock key={o.id} o={o} open={opened[o.id] ?? i === 0} onToggle={() => setOpened(s => ({ ...s, [o.id]: !(s[o.id] ?? i === 0) }))} showFolder={isAll} />)}
          {loose.length > 0 && <><div className="divider"></div><h3 className="section-heading" style={{ marginBottom: 10 }}>Steps with no outcome</h3>
            {loose.map(t => <div key={t.id} className="task-line"><CheckRow task={t} /><button className="raw-more task-edit" aria-label={`Edit step: ${t.name}`} onClick={() => modal({ kind: 'taskEdit', id: t.id })}><Icon name="edit-3" /></button></div>)}
            <p className="small-note">Open a step to attach it to an outcome.</p></>}
          <div className="divider"></div><div className="row-between"><h3 className="section-heading">Relationships</h3><button className="mini-button" onClick={() => modal({ kind: 'relationship' })}><Icon name="plus" /> Add relationship</button></div>
          <div className="stack rel-list">{rels.map(r => <RelRow key={r.id} r={r} ws={ws} />)}{!rels.length && <p className="small-note">No relationships here yet.</p>}</div>
          <div className="divider"></div><div className="row-between"><h3 className="section-heading">Ideas worth keeping</h3><button className="mini-button" onClick={() => modal({ kind: 'idea', id: null, folderId: folder?.id ?? null })}><Icon name="plus" /> Add idea</button></div>
          <p className="small-note">A possibility, not a commitment. It only becomes work if you promote it.</p>
          {ideas.filter(i => showArchivedIdeas || !i.archived_at).map(i => (
            <div key={i.id} className={`idea-row ${i.archived_at ? 'is-archived' : ''}`}><span className="folder"><Icon name="lightbulb" /></span>
              <span className="idea-copy"><strong>{i.name}</strong>{i.notes && <small>{i.notes}</small>}{i.archived_at && <small>Archived</small>}</span>
              <span className="rel-actions"><button className="mini-button" aria-label={`Edit idea: ${i.name}`} onClick={() => modal({ kind: 'idea', id: i.id, folderId: i.folder_id })}>Edit</button>
                {i.archived_at ? <button className="mini-button" aria-label={`Restore idea: ${i.name}`} onClick={() => api.run((w, c) => archiveIdea(w, c, i.id, false))}>Restore</button> : <>
                  <button className="mini-button" aria-label={`Promote idea: ${i.name}`} onClick={() => modal({ kind: 'promote', id: i.id })}>Promote</button>
                  <button className="mini-button" aria-label={`Archive idea: ${i.name}`} onClick={() => api.run((w, c) => archiveIdea(w, c, i.id, true))}>Archive</button></>}</span></div>))}
          {!ideas.some(i => !i.archived_at) && <p className="small-note">No ideas yet.</p>}
          {ideas.some(i => i.archived_at) && <button className="quiet-button" aria-pressed={showArchivedIdeas} onClick={() => setShowArchivedIdeas(v => !v)}>{showArchivedIdeas ? 'Hide archived ideas' : 'Show archived ideas'}</button>}
          {caps.length > 0 && <><div className="divider"></div><h3 className="section-heading" style={{ marginBottom: 10 }}>{isAll ? 'Captures not filed yet' : 'Captures filed here'}</h3>
            {caps.slice(0, 6).map(c => <div key={c.id} className="backlog-row"><span className="folder"><Icon name="inbox" /></span><strong>{c.edited_text ?? c.text}</strong></div>)}{caps.length > 6 && <p className="small-note">{caps.length - 6} more in the Inbox.</p>}</>}
          <p className="endnote">Only confirmed “blocks” relationships hold work up; suggestions never do.</p></section>
      </div>
    </>
  );
}
