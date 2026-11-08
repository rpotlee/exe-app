import { useEffect, useState, type FormEvent } from 'react';
import * as C from '../../src/domain/commands';
import { computeSuggestion, activeIds } from '../../src/domain/engine';
import { entityName } from '../../src/domain/blocking';
import type { RelationshipKind } from '../../src/domain/model';
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { stepsOf, progressOf } from '../../src/domain/progress';
import { captureText, propose } from '../../src/domain/review';
import { search } from '../../src/domain/search';
import { importWrites, parseBackup, type Parsed } from '../../src/domain/backup';
import { CheckRow } from '../ui/CheckRow';
import { Icon } from '../ui/Icon';
import { PROVIDER_NAMES, type AiSettings, type Provider } from './ai';
import { weeklyId, weeklySummary } from '../../src/domain/weekly';
import { describeAudit } from '../../src/domain/insight';
import { Modal, useDialog } from '../ui/Modal';
import { useApp, type ModalState } from './context';

const val = (f: FormData, k: string): string => String(f.get(k) ?? '');
const orNull = (s: string): string | null => (s ? s : null);
const DRAFT = 'exe-capture-draft';

export function Dialogs({ m }: { m: ModalState }) {
  switch (m.kind) {
    case 'capture': return <CaptureSheet />;
    case 'history': return <HistoryDialog />;
    case 'approveSelected': return <ApproveSelected items={m.items} />;
    case 'split': return <SplitDialog id={m.id} folderId={m.folderId} />;
    case 'steps': return <StepsDialog outcomeId={m.outcomeId} />;
    case 'idea': return <IdeaForm id={m.id} folderId={m.folderId} />;
    case 'promote': return <PromoteIdea id={m.id} />;
    case 'weekly': return <WeeklyDialog />;
    case 'search': return <SearchDialog />;
    case 'restore': return <RestoreDialog parsed={m.parsed} />;
    case 'placement': return <Placement id={m.id} folderId={m.folderId} mergeWith={m.mergeWith} />;
    case 'mergePreview': return <MergePreview id={m.id} otherId={m.otherId} folderId={m.folderId} type={m.type} />;
    case 'decisionForm': return <DecisionForm id={m.id} />;
    case 'optionAdd': return <OptionAdd decisionId={m.decisionId} />;
    case 'optionEdit': return <OptionEdit id={m.id} />;
    case 'resolve': return <ResolveDecision id={m.id} />;
    case 'focusMode': return <FocusMode id={m.id} />;
    case 'settings': return <Settings />;
    case 'complete': return <CompleteOutcome id={m.id} prompted={m.prompted} />;
    case 'swap': return <Swap toId={m.toId} />;
    case 'priority': return <PriorityConfirm />;
    case 'folder': return <FolderForm id={m.id} />;
    case 'folderDelete': return <FolderDelete id={m.id} />;
    case 'outcomeNew': return <OutcomeNew folderId={m.folderId} />;
    case 'outcomeEdit': return <OutcomeEdit id={m.id} />;
    case 'taskEdit': return <TaskEdit id={m.id} />;
    case 'taskNew': return <TaskNew outcomeId={m.outcomeId} />;
    case 'relationship': return <RelationshipNew />;
    case 'captureEdit': return <CaptureEdit id={m.id} />;
  }
}

function CaptureSheet() {
  const { api, modal } = useApp();
  const [text, setText] = useState(() => { try { return sessionStorage.getItem(DRAFT) ?? ''; } catch { return ''; } });
  const [error, setError] = useState('');
  const change = (v: string) => { setText(v); setError(''); try { sessionStorage.setItem(DRAFT, v); } catch { /* a draft is a convenience */ } };
  const submit = (e: FormEvent) => { e.preventDefault(); if (api.run((w, c) => C.addCaptures(w, c, text))) { try { sessionStorage.removeItem(DRAFT); } catch { /* ignore */ } modal(null); } else setError('Write something first.'); };
  return (
    <Modal title="Quick Capture" onClose={() => modal(null)}>
      <p className="helper">What's on your mind? An unsaved draft is kept if you close this.</p>
      <form onSubmit={submit}>
        <textarea className="capture-textarea" aria-label="Capture text" value={text} onChange={e => change(e.target.value)} placeholder={'Capture a thought, task, or idea…\nOr paste several thoughts.'} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="capture-foot"><span className="small-note">Saved to Inbox.</span><button className="primary-button" type="submit">Save</button></div>
      </form>
    </Modal>
  );
}

function Settings() {
  const { api, modal, where, signOut } = useApp();
  const ws = api.ws;
  const [name, setName] = useState(ws.settings?.workspace_name ?? '');
  const [note, setNote] = useState('');
  const exportJson = () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(ws, null, 2)], { type: 'application/json' })); a.download = 'exe-backup.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 800);
  };
  return (
    <Modal title="Settings" onClose={() => modal(null)}>
      <p className="helper">Signed in as <strong>{where}</strong>.</p>
      <form className="stack" onSubmit={e => { e.preventDefault(); api.run((w, c) => C.setWorkspaceName(w, c, name)); }}>
        <label className="form-field"><span className="small-note">Workspace name</span><input className="text-input" value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder="My workspace" /></label>
        <div className="button-row"><button className="mini-button" type="submit">Save name</button></div>
      </form>
      <div className="divider"></div>
      <div className="recommendation"><span className="review-tag">BACKUP</span><p>Download everything as a file. Supabase's free plan has no automatic backups, so keep one.</p>
        <div className="button-row"><button className="primary-button" onClick={exportJson}>Download JSON backup</button></div></div>
      <div className="divider"></div>
      <div className="recommendation"><span className="review-tag">HISTORY</span><p>What you approved, applied or undid, in words. Original captures are never removed by any of it.</p><div className="button-row"><button className="mini-button" onClick={() => modal({ kind: 'history' })}>Open history</button></div></div>
      <div className="divider"></div>
      <div className="recommendation"><span className="review-tag">RESTORE OR IMPORT</span><p>Load a backup from this app, or the file the old prototype exported. You see what is in it first, and nothing changes until you confirm.</p>
        <label className="form-field"><span className="small-note">Backup file (.json)</span><input className="text-input" type="file" accept="application/json,.json" aria-label="Backup file" onChange={e => { const f = e.target.files?.[0]; if (!f) return; setNote(''); f.text().then(t => { const r = parseBackup(t); if (!r.ok) setNote(r.error); else modal({ kind: 'restore', parsed: r.parsed }); }).catch(() => setNote('Could not read that file.')); e.target.value = ''; }} /></label>
        {note && <p className="form-error" role="alert">{note}</p>}</div>
      <AiSection />
      <div className="divider"></div>
      <div className="recommendation"><span className="review-tag">HELP AND ACCOUNT</span><p>New to Exe, or stuck? The help center explains every feature.</p>
        <div className="button-row"><a className="mini-button" href="/support/index.html" target="_blank" rel="noopener">Help &amp; support</a>{signOut && <button className="mini-button" onClick={() => { modal(null); signOut(); }}>Sign out</button>}</div></div>
    </Modal>
  );
}

function CompleteOutcome({ id, prompted }: { id: string; prompted: boolean }) {
  const { api, modal } = useApp();
  const o = api.ws.outcomes.find(x => x.id === id);
  if (!o) return null;
  return (
    <Modal title={prompted ? 'All steps are done' : 'Mark outcome done'} onClose={() => modal(null)}>
      <p className="helper">{prompted ? 'Finishing every step does not finish the outcome. ' : ''}Is <strong>{o.name}</strong> done?</p>
      <div className="recommendation"><span className="review-tag">DEFINITION OF DONE</span><p>{o.description || o.name}</p></div>
      <p className="small-note">Confirming frees its Now slot if it has one. Nothing is moved into that slot for you.</p>
      <div className="capture-foot"><button className="quiet-button" onClick={() => modal(null)}>Not yet</button>
        <button className="primary-button" onClick={() => { api.run((w, c) => C.completeOutcome(w, c, id)); modal(null); }}>Yes, it’s done</button></div>
    </Modal>
  );
}

function Swap({ toId }: { toId: string }) {
  const { api, modal } = useApp();
  const ws = api.ws, to = ws.outcomes.find(o => o.id === toId);
  if (!to) return null;
  return (
    <Modal title="Keep focus to three" onClose={() => modal(null)}>
      <p className="helper">Choose which active priority to move to Next before adding <strong>{to.name}</strong>.</p>
      <div className="stack">{activeIds(ws).map(id => (
        <button key={id} className="search-result" onClick={() => { api.run((w, c) => C.swapNow(w, c, id, toId)); modal(null); }}>
          <strong>Replace: {entityName(ws, id)}</strong><small>Move it to Next and activate {to.name}</small></button>))}</div>
    </Modal>
  );
}

function PriorityConfirm() {
  const { api, modal } = useApp();
  const ws = api.ws, sg = computeSuggestion(ws);
  if (!sg) return null;
  const before = activeIds(ws), removed = sg.changes.flatMap(c => (c.remove ? [c.remove] : [])), after = before.filter(i => !removed.includes(i)).concat(sg.changes.map(c => c.add));
  const list = (ids: string[]) => <ul className="confirm-list">{ids.map(i => <li key={i}>{entityName(ws, i)}</li>)}{!ids.length && <li>(none)</li>}</ul>;
  return (
    <Modal title="Apply this change?" onClose={() => modal(null)}>
      <p className="helper">Your active priorities will change as shown. Removed outcomes move to Next; their steps and progress are kept.</p>
      <div className="confirm-grid"><div><div className="eyebrow">NOW, BEFORE</div>{list(before)}</div><div><div className="eyebrow">NOW, AFTER</div>{list(after)}</div></div>
      <div className="capture-foot"><button className="quiet-button" onClick={() => modal(null)}>Cancel</button>
        <button className="primary-button" onClick={() => { api.run((w, c) => C.applyPriority(w, c, sg)); modal(null); }}>Apply change</button></div>
    </Modal>
  );
}

function FolderForm({ id }: { id: string | null }) {
  const { api, modal, setFolderSel } = useApp();
  const f = id ? api.ws.folders.find(x => x.id === id) : null;
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const d = new FormData(e.currentTarget);
    if (api.run((w, c) => (f ? C.renameFolder(w, f.id, val(d, 'name'), val(d, 'description')) : C.createFolder(w, c, val(d, 'name'), val(d, 'description'))))) {
      if (!f) { const made = api.get().folders.at(-1); if (made) setFolderSel(made.id); }
      modal(null);
    }
  };
  return (
    <Modal title={f ? 'Rename folder' : 'New folder'} onClose={() => modal(null)}>
      <p className="helper">{f ? 'Everything filed in it stays filed.' : 'A folder groups related outcomes, decisions and notes, for example Home or Work.'}</p>
      <form onSubmit={submit}>
        <label className="form-field"><span className="small-note">Name</span><input className="text-input" name="name" required maxLength={60} defaultValue={f?.name ?? ''} placeholder="e.g. Home" /></label>
        <label className="form-field"><span className="small-note">Description (optional)</span><input className="text-input" name="description" maxLength={160} defaultValue={f?.description ?? ''} /></label>
        <div className="capture-foot"><span></span><button className="primary-button" type="submit">{f ? 'Save' : 'Create folder'}</button></div>
      </form>
    </Modal>
  );
}

function FolderDelete({ id }: { id: string }) {
  const { api, modal, go, setFolderSel } = useApp();
  const ws = api.ws, f = ws.folders.find(x => x.id === id);
  const [to, setTo] = useState('');
  if (!f) return null;
  const c = C.folderContents(ws, id), parts = ([[c.outcomes.length, 'outcome'], [c.decisions.length, 'decision'], [c.ideas.length, 'idea'], [c.captures.length, 'capture']] as const).filter(p => p[0]).map(p => `${p[0]} ${p[1]}${p[0] === 1 ? '' : 's'}`);
  return (
    <Modal title="Delete folder" onClose={() => modal(null)}>
      <p className="helper">{parts.length ? <>“{f.name}” holds {parts.join(', ')}. Nothing is deleted with the folder. Choose where these items go.</> : <>“{f.name}” is empty. Delete it?</>}</p>
      <form onSubmit={e => { e.preventDefault(); if (api.run((w, cx) => C.deleteFolder(w, cx, id, orNull(to)))) { setFolderSel('all'); modal(null); go('map'); } }}>
        {parts.length > 0 && <label className="form-field"><span className="small-note">Move them to</span>
          <select className="select" value={to} onChange={e => setTo(e.target.value)}><option value="">All notes (not filed)</option>{ws.folders.filter(x => x.id !== id).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
        <div className="capture-foot"><button type="button" className="quiet-button" onClick={() => modal(null)}>Cancel</button><button className="primary-button" type="submit">Delete folder</button></div>
      </form>
    </Modal>
  );
}

function OutcomeNew({ folderId }: { folderId: string | null }) {
  const { api, modal } = useApp();
  const name = folderId ? api.ws.folders.find(f => f.id === folderId)?.name ?? 'Not filed' : 'Not filed';
  return (
    <Modal title="Add outcome" onClose={() => modal(null)}>
      <p className="helper">A result you want to achieve, for example “Book the venue”. It starts in Later; you choose what becomes active.</p>
      <form onSubmit={e => { e.preventDefault(); const d = new FormData(e.currentTarget); if (api.run((w, c) => C.addOutcome(w, c, { folderId, name: val(d, 'name'), description: val(d, 'description') }))) modal(null); }}>
        <label className="form-field"><span className="small-note">Outcome</span><input className="text-input" name="name" required maxLength={200} placeholder="What do you want to achieve?" /></label>
        <label className="form-field"><span className="small-note">Definition of done (optional)</span><textarea className="text-input" name="description" maxLength={600} placeholder="How will you know it is finished?" /></label>
        <div className="capture-foot"><span className="small-note">Filed in {name}.</span><button className="primary-button" type="submit">Add outcome</button></div>
      </form>
    </Modal>
  );
}

function OutcomeEdit({ id }: { id: string }) {
  const { api, modal } = useApp();
  const ws = api.ws, o = ws.outcomes.find(x => x.id === id);
  if (!o) return null;
  return (
    <Modal title="Outcome details" onClose={() => modal(null)}>
      <p className="helper">Deadline and effort are optional and only your own entries are used. The Priority Engine never invents a date.</p>
      <form onSubmit={e => { e.preventDefault(); const d = new FormData(e.currentTarget); if (api.run(w => C.updateOutcome(w, id, { name: val(d, 'name'), description: val(d, 'description'), folderId: orNull(val(d, 'folder')), deadline: orNull(val(d, 'deadline')), effort: orNull(val(d, 'effort')) }))) modal(null); }}>
        <label className="form-field"><span className="small-note">Outcome</span><input className="text-input" name="name" required maxLength={200} defaultValue={o.name} /></label>
        <label className="form-field"><span className="small-note">Definition of done</span><textarea className="text-input" name="description" maxLength={600} defaultValue={o.description} /></label>
        <label className="form-field"><span className="small-note">Folder</span><select className="select" name="folder" defaultValue={o.folder_id ?? ''}><option value="">Not filed</option>{ws.folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
        <label className="form-field"><span className="small-note">Deadline</span><input className="text-input" type="date" name="deadline" defaultValue={o.deadline ?? ''} /></label>
        <label className="form-field"><span className="small-note">Effort (your estimate)</span><input className="text-input" name="effort" maxLength={60} defaultValue={o.effort ?? ''} placeholder="e.g. about 3 hours" /></label>
        <div className="capture-foot"><span className="small-note">Saved with your workspace.</span><button className="primary-button" type="submit">Save details</button></div>
      </form>
    </Modal>
  );
}

function TaskNew({ outcomeId }: { outcomeId: string | null }) {
  const { api, modal } = useApp();
  const o = api.ws.outcomes.find(x => x.id === outcomeId);
  return (
    <Modal title="Add a step" onClose={() => modal(null)}>
      <p className="helper">Add a concrete action{o ? <> under <strong>{o.name}</strong></> : ''}.</p>
      <form onSubmit={e => { e.preventDefault(); if (api.run((w, c) => C.addTask(w, c, outcomeId, val(new FormData(e.currentTarget), 'task')))) modal(null); }}>
        <label className="form-field"><span className="small-note">Task</span><input className="text-input" name="task" required maxLength={200} placeholder="What is the next action?" /></label>
        <div className="capture-foot"><span className="small-note">This won't change your Focus Board placement.</span><button className="primary-button" type="submit">Add step</button></div>
      </form>
    </Modal>
  );
}

function TaskEdit({ id }: { id: string }) {
  const { api, modal } = useApp();
  const ws = api.ws, t = ws.tasks.find(x => x.id === id);
  const [error, setError] = useState('');
  if (!t) return null;
  return (
    <Modal title="Edit step" onClose={() => modal(null)}>
      <form onSubmit={e => { e.preventDefault(); const d = new FormData(e.currentTarget); const before = api.get(); const r = C.editTask(before, id, { name: val(d, 'name'), outcomeId: orNull(val(d, 'outcome')), effort: orNull(val(d, 'effort')), notes: val(d, 'notes'), deadline: orNull(val(d, 'deadline')) }); if (!r.ok) { setError(r.error); return; } api.run(() => r); modal(null); }}>
        <label className="form-field"><span className="small-note">Step</span><input className="text-input" name="name" required maxLength={200} defaultValue={t.name} /></label>
        <label className="form-field"><span className="small-note">Outcome</span><select className="select" name="outcome" defaultValue={t.outcome_id ?? ''}><option value="">No outcome (loose step)</option>{ws.outcomes.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
        <label className="form-field"><span className="small-note">Effort (your estimate, e.g. 20 min)</span><input className="text-input" name="effort" maxLength={60} defaultValue={t.effort ?? ''} placeholder="Helps “I have 20 minutes”" /></label>
        <label className="form-field"><span className="small-note">Deadline (optional)</span><input className="text-input" type="date" name="deadline" defaultValue={t.deadline ?? ''} /></label>
        <label className="form-field"><span className="small-note">Notes</span><textarea className="text-input" name="notes" defaultValue={t.notes} /></label>
        <div className="button-row">
          <button type="button" className="mini-button" onClick={() => api.run(w => C.moveTask(w, id, 'up'))}>Move up</button>
          <button type="button" className="mini-button" onClick={() => api.run(w => C.moveTask(w, id, 'down'))}>Move down</button>
          <button type="button" className="mini-button" onClick={() => { api.run((w, c) => C.archiveTask(w, c, id, true)); modal(null); }}>Archive step</button></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="capture-foot"><span className="small-note">Completion is unchanged.</span><button className="primary-button" type="submit">Save step</button></div>
      </form>
    </Modal>
  );
}

function RelationshipNew() {
  const { api, modal } = useApp();
  const ws = api.ws, [error, setError] = useState('');
  const options = (<><option value="">Choose…</option>
    <optgroup label="Outcomes">{ws.outcomes.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</optgroup>
    <optgroup label="Tasks">{ws.tasks.filter(t => !t.archived_at).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>
    <optgroup label="Decisions">{ws.decisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</optgroup></>);
  return (
    <Modal title="Add a relationship" onClose={() => modal(null)}>
      <p className="helper">Only a confirmed “blocks” relationship holds work up. Nothing is changed in your Focus Board.</p>
      <form onSubmit={e => { e.preventDefault(); const d = new FormData(e.currentTarget);
        const input = { from: val(d, 'from'), to: val(d, 'to'), kind: val(d, 'kind') as RelationshipKind, description: val(d, 'description'), confirmed: !d.get('suggestion') };
        const r = C.addRelationship(api.get(), api.ctx, input); if (!r.ok) { setError(r.error); return; } api.run(() => r); modal(null); }}>
        <label className="form-field"><span className="small-note">From</span><select className="select" name="from" required>{options}</select></label>
        <label className="form-field"><span className="small-note">Relationship</span><select className="select" name="kind" required><option value="blocks">blocks: must be finished first</option><option value="informs">informs: useful context</option><option value="related">related: connected, no order</option></select></label>
        <label className="form-field"><span className="small-note">To</span><select className="select" name="to" required>{options}</select></label>
        <label className="form-field"><span className="small-note">Note (optional)</span><input className="text-input" name="description" maxLength={160} placeholder="Why are these connected?" /></label>
        <label className="check-row suggestion-toggle"><input type="checkbox" name="suggestion" /><span>Save as a suggestion only (blocks nothing until I confirm it)</span></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="capture-foot"><span></span><button className="primary-button" type="submit">Add relationship</button></div>
      </form>
    </Modal>
  );
}

function CaptureEdit({ id }: { id: string }) {
  const { api, modal } = useApp();
  const c = api.ws.captures.find(x => x.id === id);
  if (!c) return null;
  return (
    <Modal title="Edit to-do" onClose={() => modal(null)}>
      <p className="helper">The original capture is kept exactly as you wrote it.</p>
      <form onSubmit={e => { e.preventDefault(); if (api.run(w => C.editCapture(w, id, val(new FormData(e.currentTarget), 'text')))) modal(null); }}>
        <label className="form-field">To-do text<textarea name="text" className="text-input" required maxLength={4000} defaultValue={c.edited_text ?? c.text} /></label>
        <button type="submit" className="primary-button">Save changes</button>
      </form>
    </Modal>
  );
}

/** Focus Mode: one outcome, its steps, nothing else. Quick Capture opens over it and returns here. */
function FocusMode({ id }: { id: string }) {
  const { api, modal } = useApp();
  const ws = api.ws, o = ws.outcomes.find(x => x.id === id), layer = useRef<HTMLDivElement>(null);
  const close = () => { modal(null); if (o && C.allStepsDone(api.get(), id)) modal({ kind: 'complete', id, prompted: true }); };
  const onKey = useDialog(layer, close);
  if (!o) return null;
  const steps = stepsOf(ws, id), p = progressOf(ws, id), folder = ws.folders.find(f => f.id === o.folder_id)?.name ?? 'Not filed';
  return createPortal(
    <div className="focus-layer" role="dialog" aria-modal="true" aria-label="Focus Mode" ref={layer} tabIndex={-1} onKeyDown={onKey}>
      <div className="focus-top"><button className="quiet-button" onClick={close}><Icon name="arrow-left" /> Return to Exe</button><button className="quiet-button" onClick={() => modal({ kind: 'capture' })}><Icon name="plus" /> Capture thought</button></div>
      <div className="focus-body"><div className="focus-label">FOCUS MODE / {folder.toUpperCase()}</div><h1>{o.name}</h1><p className="lead">One priority. The next clear action. Everything else can wait.</p>
        <div className="focus-panel"><div className="row-between"><h3 className="section-heading">Your checklist</h3><span className="pill blue">{p.done} of {p.total} done</span></div>
          {steps.map(t => <CheckRow key={t.id} task={t} />)}{!steps.length && <p className="small-note">No steps yet.</p>}</div>
        <div className="focus-actions"><span className="small-note">New thoughts go to Inbox, not your active work.</span><button className="quiet-button" onClick={() => modal({ kind: 'steps', outcomeId: id })}><Icon name="list-checks" /> Break it down</button><button className="quiet-button" onClick={close}>Finish session <Icon name="check" /></button></div></div>
    </div>, document.getElementById('modal-root') as HTMLElement);
}

function DecisionForm({ id }: { id: string | null }) {
  const { api, modal, setDecisionSel } = useApp();
  const ws = api.ws, d = id ? ws.decisions.find(x => x.id === id) : null;
  return (
    <Modal title={d ? 'Edit decision' : 'New decision'} onClose={() => modal(null)}>
      <p className="helper">{d ? 'Change the wording. The change is recorded in the log.' : 'Write the question you need to settle. You can add options and evidence afterwards.'}</p>
      <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget), input = { name: val(f, 'name'), description: val(f, 'description'), folderId: orNull(val(f, 'folder')) };
        if (api.run((w, c) => (d ? C.editDecision(w, c, d.id, input) : C.createDecision(w, c, input)))) { if (!d) { const made = api.get().decisions.at(-1); if (made) setDecisionSel(made.id); } modal(null); } }}>
        <label className="form-field"><span className="small-note">Question</span><input className="text-input" name="name" required maxLength={200} defaultValue={d?.name ?? ''} placeholder="What needs to be decided?" /></label>
        <label className="form-field"><span className="small-note">Context (optional)</span><textarea className="text-input" name="description" maxLength={600} defaultValue={d?.description ?? ''} /></label>
        <label className="form-field"><span className="small-note">Folder</span><select className="select" name="folder" defaultValue={d?.folder_id ?? ''}><option value="">Not filed</option>{ws.folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
        <div className="capture-foot"><span></span><button className="primary-button" type="submit">{d ? 'Save changes' : 'Add decision'}</button></div>
      </form>
    </Modal>
  );
}

function OptionAdd({ decisionId }: { decisionId: string }) {
  const { api, modal } = useApp();
  const [error, setError] = useState('');
  return (
    <Modal title="Add an option" onClose={() => modal(null)}>
      <p className="helper">A possibility to consider when deciding.</p>
      <form onSubmit={e => { e.preventDefault(); const r = C.addOption(api.get(), api.ctx, decisionId, val(new FormData(e.currentTarget), 'option')); if (!r.ok) { setError(r.error); return; } api.run(() => r); modal(null); }}>
        <input className="text-input" name="option" required maxLength={160} placeholder="Option or approach" aria-label="Option" />
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="capture-foot"><span></span><button className="primary-button" type="submit">Add option</button></div>
      </form>
    </Modal>
  );
}

function OptionEdit({ id }: { id: string }) {
  const { api, modal } = useApp();
  const o = api.ws.decisionOptions.find(x => x.id === id), [error, setError] = useState('');
  if (!o) return null;
  return (
    <Modal title="Edit option" onClose={() => modal(null)}>
      <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); if (val(f, 'option').trim() !== o.text) { const r = C.renameOption(api.get(), api.ctx, id, val(f, 'option')); if (!r.ok) { setError(r.error); return; } api.run(() => r); } api.run(w => C.setOptionNotes(w, id, { pros: val(f, 'pros'), cons: val(f, 'cons') })); modal(null); }}>
        <input className="text-input" name="option" required maxLength={160} defaultValue={o.text} aria-label="Option text" />
        <label className="form-field"><span className="small-note">What is good about it (your words)</span><textarea className="text-input" name="pros" maxLength={2000} defaultValue={o.pros} /></label>
        <label className="form-field"><span className="small-note">What is not so good</span><textarea className="text-input" name="cons" maxLength={2000} defaultValue={o.cons} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="capture-foot"><button type="button" className="quiet-button" onClick={() => { const r = C.removeOption(api.get(), api.ctx, id); if (!r.ok) { setError(r.error); return; } api.run(() => r); modal(null); }}>Remove option</button>
          <button className="primary-button" type="submit">Save option</button></div>
      </form>
    </Modal>
  );
}

function ResolveDecision({ id }: { id: string }) {
  const { api, modal } = useApp();
  const ws = api.ws, d = ws.decisions.find(x => x.id === id), opts = C.optionsOf(ws, id);
  const [chosen, setChosen] = useState(''), [conclusion, setConclusion] = useState(d?.conclusion ?? '');
  if (!d) return null;
  return (
    <Modal title="Record your decision" onClose={() => modal(null)}>
      <p className="helper">{d.name}<br />Record what you chose before marking it resolved. No tasks or priorities will be changed automatically.</p>
      <form onSubmit={e => { e.preventDefault(); if (api.run((w, c) => C.resolveDecision(w, c, id, { chosenOption: chosen, conclusion, rationale: val(new FormData(e.currentTarget), 'rationale') }))) modal(null); }}>
        {opts.length > 0 && <label className="form-field"><span className="small-note">Chosen option</span><select className="select" value={chosen} onChange={e => { setChosen(e.target.value); if (e.target.value && !conclusion.trim()) setConclusion(e.target.value); }}><option value="">Something else</option>{opts.map(o => <option key={o.id} value={o.text}>{o.text}</option>)}</select></label>}
        <label className="form-field"><span className="small-note">Your decision</span><input className="text-input" value={conclusion} onChange={e => setConclusion(e.target.value)} required maxLength={320} placeholder="What did you decide?" /></label>
        <label className="form-field"><span className="small-note">Why (optional)</span><textarea className="text-input" name="rationale" maxLength={800} defaultValue={d.rationale} /></label>
        <div className="capture-foot"><span className="small-note">This will not move any Focus Board items.</span><button className="primary-button" type="submit">Confirm decision</button></div>
      </form>
    </Modal>
  );
}

/** A step with no matching outcome: ask. Nothing is created unless the user picks it. */
function Placement({ id, folderId, mergeWith }: { id: string; folderId: string | null; mergeWith: string | null }) {
  const { api, modal } = useApp();
  const ws = api.ws, c = ws.captures.find(x => x.id === id), open = ws.outcomes.filter(o => !o.done_at);
  const [choice, setChoice] = useState<'loose' | 'existing' | 'create'>('loose'), [outcome, setOutcome] = useState(open[0]?.id ?? ''), [name, setName] = useState(c ? captureText(c) : '');
  if (!c) return null;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const p = propose(ws, c), a: C.Approval = { type: 'Task', folderId, outcomeId: choice === 'existing' && outcome ? outcome : null, title: p.title, ...(choice === 'create' ? { newOutcomeName: name } : {}) };
    if (api.run((w, cx) => (mergeWith ? C.mergeCaptures(w, cx, id, mergeWith, a) : C.approveCapture(w, cx, id, a)))) modal(null);
  };
  return (
    <Modal title="Where does this step go?" onClose={() => modal(null)}>
      <p className="helper"><q>{captureText(c)}</q><br />No outcome matches it. Choose one option. Nothing is created unless you pick it.</p>
      <form onSubmit={submit}>
        <label className="form-field"><span className="small-note">What should happen</span><select className="select" value={choice} onChange={e => setChoice(e.target.value as typeof choice)}><option value="loose">Leave it loose (no outcome)</option>{open.length > 0 && <option value="existing">Add it to an existing outcome</option>}<option value="create">Create a new outcome for it</option></select></label>
        {open.length > 0 && <label className="form-field"><span className="small-note">Existing outcome</span><select className="select" value={outcome} onChange={e => setOutcome(e.target.value)}>{open.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>}
        <label className="form-field"><span className="small-note">New outcome name</span><input className="text-input" value={name} onChange={e => setName(e.target.value)} maxLength={200} /></label>
        <div className="capture-foot"><span></span><button className="primary-button" type="submit">Approve</button></div>
      </form>
    </Modal>
  );
}

function MergePreview({ id, otherId, folderId, type }: { id: string; otherId: string; folderId: string | null; type: C.Approval['type'] }) {
  const { api, modal } = useApp();
  const ws = api.ws, a = ws.captures.find(x => x.id === id), b = ws.captures.find(x => x.id === otherId);
  if (!a || !b) return null;
  const p = propose(ws, a);
  const confirm = () => {
    if (type === 'Task' && !p.outcomeId) { modal(null); modal({ kind: 'placement', id, folderId, mergeWith: otherId }); return; }
    if (api.run((w, c) => C.mergeCaptures(w, c, id, otherId, { type, folderId, outcomeId: p.outcomeId, title: p.title }))) modal(null);
  };
  return (
    <Modal title="Preview merge" onClose={() => modal(null)}>
      <p className="helper">Nothing is deleted. Both captures stay in your Inbox exactly as written, and both are linked to the result.</p>
      <div className="merge-grid"><div><div className="eyebrow">CAPTURE A</div><p className="review-original">{captureText(a)}</p></div><div><div className="eyebrow">CAPTURE B</div><p className="review-original">{captureText(b)}</p></div></div>
      <div className="recommendation"><span className="review-tag">RESULT</span><p>One {type === 'Note' ? 'note' : type.toLowerCase()}: <strong>{p.title}</strong>. Both captures point to it. You can undo this.</p></div>
      <div className="capture-foot"><button className="quiet-button" onClick={() => modal(null)}>Cancel</button><button className="primary-button" onClick={confirm}>Merge</button></div>
    </Modal>
  );
}

function SearchDialog() {
  const { api, modal, go, setFolderSel, setDecisionSel } = useApp();
  const [q, setQ] = useState('');
  const hits = search(api.ws, q);
  const open = (h: ReturnType<typeof search>[number]) => {
    modal(null);
    if (h.kind === 'Decision') { setDecisionSel(h.id); go('decisions'); }
    else if (h.kind === 'Capture') go('inbox');
    else { setFolderSel(h.kind === 'Folder' ? h.id : h.folderId ?? 'all'); go('map'); }
  };
  return (
    <Modal title="Search Exe" onClose={() => modal(null)}>
      <p className="helper">Find captures, steps, outcomes, decisions, ideas and folders. Plain text matching; nothing is guessed.</p>
      <input className="text-input" aria-label="Search all work" placeholder="Try pricing, plumber, venue…" value={q} onChange={e => setQ(e.target.value)} />
      <div className="search-results" role="status">
        {!q.trim() ? <p className="small-note">Start typing to search your work.</p> : hits.length ? hits.map(h => (
          <button key={h.kind + h.id} className="search-result" onClick={() => open(h)}><strong>{h.title}</strong><small>{h.kind}{h.archived ? ' (archived)' : ''} · {h.context}</small></button>)) : <p className="small-note">No matches found.</p>}
      </div>
    </Modal>
  );
}

function RestoreDialog({ parsed }: { parsed: Parsed }) {
  const { api, modal } = useApp();
  const [mode, setMode] = useState<'add' | 'replace'>('add');
  const c = parsed.counts, cur = api.ws;
  const download = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(cur, null, 2)], { type: 'application/json' })); a.download = 'exe-backup-before-restore.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 800); };
  const go = () => {
    const r = importWrites(api.get(), api.ctx, parsed.ws, mode);
    if (api.run(() => ({ ok: true as const, writes: r.writes, note: mode === 'replace' ? 'Backup restored. Your previous workspace was replaced.' : 'Backup added to your workspace.' }))) modal(null);
  };
  const list = Object.entries(c).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(', ') || 'nothing';
  return (
    <Modal title="Restore from backup" onClose={() => modal(null)}>
      <p className="helper">This file is {parsed.kind === 'prototype' ? 'from the old prototype' : 'an Exe backup'} and contains: <strong>{list}</strong>. Original wording is kept, and nothing is marked done that was not.</p>
      {parsed.warnings.length > 0 && <ul className="small-note">{parsed.warnings.map(w => <li key={w}>{w}</li>)}</ul>}
      <fieldset className="stack"><legend className="small-note">How should it be added?</legend>
        <label className="check-row"><input type="radio" name="mode" checked={mode === 'add'} onChange={() => setMode('add')} /><span>Add to what I have (keeps everything already here)</span></label>
        <label className="check-row"><input type="radio" name="mode" checked={mode === 'replace'} onChange={() => setMode('replace')} /><span>Replace everything with this backup</span></label></fieldset>
      {mode === 'replace' && <div className="recommendation"><span className="review-tag">BEFORE YOU REPLACE</span><p>Your current workspace ({Object.values(countsOfWs(cur)).reduce((a, b) => a + b, 0)} items) will be removed. Download a copy first so you can undo this.</p><div className="button-row"><button type="button" className="mini-button" onClick={download}>Download a copy of my current workspace</button></div></div>}
      <div className="capture-foot"><button className="quiet-button" onClick={() => modal(null)}>Cancel</button><button className="primary-button" onClick={go}>{mode === 'replace' ? 'Replace everything' : 'Add to my workspace'}</button></div>
    </Modal>
  );
}
const countsOfWs = (w: { folders: unknown[]; outcomes: unknown[]; tasks: unknown[]; captures: unknown[]; decisions: unknown[]; ideas: unknown[] }) => ({ f: w.folders.length, o: w.outcomes.length, t: w.tasks.length, c: w.captures.length, d: w.decisions.length, i: w.ideas.length });

/** Bring your own AI. The key is sent to the server once, encrypted there, and never shown again. Nothing is sent to a provider until you accept the notice. */
function AiSection() {
  const { ai } = useApp();
  const [cfg, setCfg] = useState<AiSettings | null | undefined>(undefined), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState<Provider>('anthropic'), [model, setModel] = useState(''), [key, setKey] = useState('');
  const load = () => { ai?.settings().then(setCfg).catch(e => { setCfg(null); setMsg((e as Error).message); }); };
  useState(() => { load(); return 0; });
  if (!ai) return <><div className="divider"></div><div className="recommendation"><span className="review-tag">AI (YOUR OWN KEY)</span><p>AI suggestions need an account, because your key is stored encrypted on the server. Sign in to set it up. Everything else works without AI.</p></div></>;
  const act = async (fn: () => Promise<unknown>, ok: string) => { setBusy(true); setMsg(''); try { await fn(); setMsg(ok); load(); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); } };
  return (
    <>
      <div className="divider"></div>
      <div className="recommendation" aria-label="AI settings"><span className="review-tag">AI (YOUR OWN KEY)</span>
        <p>Exe has no AI bill. You connect your own provider and pay them directly. The app works fully without AI.</p>
        {cfg ? (<>
          <p className="small-note"><strong>{PROVIDER_NAMES[cfg.provider]}</strong> · model <strong>{cfg.model}</strong> · key ending <strong>{cfg.key_last4}</strong> · {cfg.enabled ? 'turned on' : 'turned off'}</p>
          {!cfg.enabled && <div className="followup"><strong>Before you turn AI on</strong><p className="small-note">When you ask for suggestions, the <strong>text of the captures you choose</strong> (or the outcome and step names you ask about), plus the names of your folders and outcomes, is sent to <strong>{PROVIDER_NAMES[cfg.provider]}</strong> using your key. Exe never sends anything on its own. Your provider's terms apply to what they receive.</p>
            <div className="button-row"><button className="primary-button" disabled={busy} onClick={() => act(() => ai.accept(), 'AI is on. Nothing is sent until you press "Get AI suggestions" in AI Review.')}>I understand, turn on AI</button></div></div>}
          <div className="button-row"><button className="mini-button" disabled={busy} onClick={() => act(async () => { const r = await ai.test(); if (!r.ok) throw new Error('The provider answered, but not as expected. Check the model name.'); }, 'Connection works.')}>Test connection</button>
            {cfg.enabled && <button className="mini-button" disabled={busy} onClick={() => act(() => ai.turnOff(), 'AI is off.')}>Turn off</button>}
            <button className="mini-button" disabled={busy} onClick={() => act(() => ai.removeKey(), 'Key removed.')}>Remove key</button></div>
        </>) : cfg === undefined ? <p className="small-note">Loading…</p> : null}
        <form className="stack" onSubmit={e => { e.preventDefault(); void act(async () => { await ai.saveKey(provider, model.trim(), key); setKey(''); }, 'Key saved on the server. It is never shown again. Accept the notice to turn AI on.'); }}>
          <label className="form-field"><span className="small-note">Provider</span><select className="select" value={provider} onChange={e => setProvider(e.target.value as Provider)}>{(Object.keys(PROVIDER_NAMES) as Provider[]).map(p => <option key={p} value={p}>{PROVIDER_NAMES[p]}</option>)}</select></label>
          <label className="form-field"><span className="small-note">Model name (from your provider)</span><input className="text-input" value={model} onChange={e => setModel(e.target.value)} required maxLength={99} placeholder="Paste the model name you want to use" autoComplete="off" /></label>
          <label className="form-field"><span className="small-note">API key</span><input className="text-input" type="password" value={key} onChange={e => setKey(e.target.value)} required autoComplete="off" spellCheck={false} placeholder="Stored encrypted on the server, never shown again" /></label>
          <div className="button-row"><button className="mini-button" type="submit" disabled={busy}>{cfg ? 'Replace key' : 'Save key'}</button></div>
        </form>
        {msg && <p className="small-note" role="status">{msg}</p>}
      </div>
    </>
  );
}

/** Break a goal into steps: type or paste one per line. With AI turned on, "Suggest steps" fills the box with editable suggestions. Nothing is added until you press Add. */
function StepsDialog({ outcomeId }: { outcomeId: string }) {
  const { api, modal, ai } = useApp();
  const o = api.ws.outcomes.find(x => x.id === outcomeId);
  const [text, setText] = useState(''), [cfg, setCfg] = useState<AiSettings | null>(null), [busy, setBusy] = useState(false), [msg, setMsg] = useState('');
  useEffect(() => { ai?.settings().then(setCfg).catch(() => setCfg(null)); }, [ai]);
  if (!o) return null;
  const suggest = async () => {
    if (!ai) return; setBusy(true); setMsg('');
    try { const r = await ai.suggestSteps(outcomeId); setText(t => (t.trim() ? t.trim() + '\n' : '') + r.steps.join('\n')); setMsg(r.steps.length ? `${r.steps.length} suggestions from ${PROVIDER_NAMES[r.provider]} (${r.model}). Edit them, delete any you do not want, then add.` : 'The AI gave no usable suggestions. Type your own steps instead.'); }
    catch (e) { setMsg((e as Error).message + ' You can type steps yourself.'); } finally { setBusy(false); }
  };
  const add = (e: FormEvent) => { e.preventDefault(); const names = text.split(/\r?\n/).map(l => l.replace(/^\s*([-*•]|\d+[.)])\s+/, '')); if (api.run((w, c) => C.addTasks(w, c, outcomeId, names))) modal(null); };
  return (
    <Modal title="Break it down" onClose={() => modal(null)}>
      <p className="helper"><strong>{o.name}</strong><br />Type or paste one small step per line. Nothing is created until you press Add.</p>
      <form onSubmit={add}>
        <textarea className="capture-textarea" aria-label="Steps, one per line" value={text} onChange={e => setText(e.target.value)} placeholder={'Read the official guidance\nList what is still unknown\nAsk one person who has done it'} />
        {cfg?.enabled ? <div className="button-row"><button type="button" className="mini-button" disabled={busy} onClick={suggest}><Icon name="sparkles" /> {busy ? 'Asking…' : 'Suggest steps with AI'}</button><span className="small-note">Sends this outcome's name, definition and step names to {PROVIDER_NAMES[cfg.provider]}.</span></div>
          : <p className="small-note">{ai ? 'Want suggestions? Turn on AI with your own key in Settings. Typing your own steps always works.' : 'AI suggestions need an account. Typing your own steps always works.'}</p>}
        {msg && <p className="small-note" role="status">{msg}</p>}
        <div className="capture-foot"><span></span><button className="primary-button" type="submit">Add steps</button></div>
      </form>
    </Modal>
  );
}

function IdeaForm({ id, folderId }: { id: string | null; folderId: string | null }) {
  const { api, modal } = useApp();
  const ws = api.ws, i = id ? ws.ideas.find(x => x.id === id) : null;
  return (
    <Modal title={i ? 'Edit idea' : 'New idea'} onClose={() => modal(null)}>
      <p className="helper">An idea is a possibility, not a commitment. It never becomes work unless you promote it.</p>
      <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget), input = { name: val(f, 'name'), notes: val(f, 'notes'), folderId: orNull(val(f, 'folder')) }; if (api.run((w, c) => (i ? C.editIdea(w, i.id, input) : C.createIdea(w, c, input)))) modal(null); }}>
        <label className="form-field"><span className="small-note">Idea</span><input className="text-input" name="name" required maxLength={200} defaultValue={i?.name ?? ''} placeholder="What if…" /></label>
        <label className="form-field"><span className="small-note">Notes (optional)</span><textarea className="text-input" name="notes" defaultValue={i?.notes ?? ''} /></label>
        <label className="form-field"><span className="small-note">Folder</span><select className="select" name="folder" defaultValue={i ? i.folder_id ?? '' : folderId ?? ''}><option value="">Not filed</option>{ws.folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
        <div className="capture-foot"><span></span><button className="primary-button" type="submit">{i ? 'Save idea' : 'Save idea'}</button></div>
      </form>
    </Modal>
  );
}

function PromoteIdea({ id }: { id: string }) {
  const { api, modal } = useApp();
  const i = api.ws.ideas.find(x => x.id === id);
  if (!i) return null;
  return (
    <Modal title="Promote to an outcome?" onClose={() => modal(null)}>
      <p className="helper"><strong>{i.name}</strong><br />This creates an outcome in <strong>Later</strong> (never in Now). The idea is kept, archived, and linked to it. You choose what becomes active.</p>
      <div className="capture-foot"><button className="quiet-button" onClick={() => modal(null)}>Not now</button><button className="primary-button" onClick={() => { api.run((w, c) => C.promoteIdea(w, c, id)); modal(null); }}>Create the outcome</button></div>
    </Modal>
  );
}

/** The optional weekly review: real counts from real dates, no streaks or scores. Closing it marks this week as seen. */
function WeeklyDialog() {
  const { api, modal } = useApp();
  const s = weeklySummary(api.ws, new Date()), close = () => { api.run((w, c) => C.dismissPrompt(w, c, weeklyId(s.week))); modal(null); };
  return (
    <Modal title="Your week" onClose={close}>
      <p className="helper">The last 7 days, from what you actually did. You can ignore this.</p>
      {s.anything ? <ul className="weekly-list">
        {s.stepsDone.map(x => <li key={x.name}><strong>{x.count}</strong> {x.count === 1 ? 'step' : 'steps'} done in <strong>{x.name}</strong></li>)}
        {s.outcomesDone.map(n => <li key={n}>You finished the outcome <strong>{n}</strong></li>)}
        {s.decisionsResolved.map(n => <li key={n}>You resolved the decision <strong>{n}</strong></li>)}
        {s.capturesAdded > 0 && <li><strong>{s.capturesAdded}</strong> {s.capturesAdded === 1 ? 'thought' : 'thoughts'} captured</li>}</ul>
        : <p className="small-note">Nothing was recorded this week. That is fine.</p>}
      <h3 className="section-heading" style={{ marginTop: 14 }}>Still open</h3>
      <ul className="weekly-list"><li>{s.unresolvedDecisions} unresolved {s.unresolvedDecisions === 1 ? 'decision' : 'decisions'}</li><li>{s.waitingReview} {s.waitingReview === 1 ? 'capture' : 'captures'} waiting for AI Review</li><li>{s.blocked} blocked (confirmed blocks only)</li></ul>
      <div className="capture-foot"><span></span><button className="primary-button" onClick={close}>Done</button></div>
    </Modal>
  );
}

function HistoryDialog() {
  const { api, modal } = useApp();
  const ws = api.ws, rows = ws.audit.slice().sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100);
  const stamp = (iso: string) => { try { return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch { return ''; } };
  return (
    <Modal title="History" onClose={() => modal(null)}>
      <p className="helper">Changes you approved, applied or undid. Nothing here was done without you.</p>
      {rows.length ? <ol className="decision-log">{rows.map(e => <li key={e.id}><span className="log-time">{stamp(e.at)}</span> {describeAudit(ws, e)}</li>)}</ol> : <p className="small-note">Nothing yet. Approvals, applied priority suggestions, finished outcomes and undos will appear here.</p>}
    </Modal>
  );
}

/** Approve a chosen group. The preview lists exactly what will be created; steps with no matching outcome stay loose. */
function ApproveSelected({ items }: { items: (C.Approval & { id: string })[] }) {
  const { api, modal } = useApp();
  const ws = api.ws, folder = (id: string | null) => ws.folders.find(f => f.id === id)?.name ?? 'Not filed';
  const go = () => { let n = 0; for (const it of items) if (api.run((w, c) => C.approveCapture(w, c, it.id, it))) n++; api.flash(`${n} ${n === 1 ? 'capture' : 'captures'} organized. Originals preserved.`); modal(null); };
  return (
    <Modal title={`Approve ${items.length} selected`} onClose={() => modal(null)}>
      <p className="helper">This is exactly what will be created. Every original capture stays as written, and you can undo each approval later.</p>
      <ul className="weekly-list">{items.map(i => <li key={i.id}><strong>{i.type === 'Note' ? 'Note' : i.type}</strong>: {i.title} <span className="small-note">({folder(i.folderId)}{i.type === 'Task' && !i.outcomeId ? ', no outcome: stays loose' : ''})</span></li>)}</ul>
      <div className="capture-foot"><button className="quiet-button" onClick={() => modal(null)}>Cancel</button><button className="primary-button" onClick={go}>Approve these</button></div>
    </Modal>
  );
}

/** One capture, several items. The person edits the pieces and picks a type for each; nothing happens until they confirm. */
function SplitDialog({ id, folderId }: { id: string; folderId: string | null }) {
  const { api, modal } = useApp();
  const c = api.ws.captures.find(x => x.id === id);
  const initial = () => { const parts = (c ? captureText(c) : '').split(/\n|;|\s+then\s+|,\s+and\s+/i).map(x => x.trim()).filter(Boolean); return (parts.length > 1 ? parts : [...parts, '']).map(title => ({ title, type: 'Task' as C.Approval['type'] })); };
  const [rows, setRows] = useState(initial), [error, setError] = useState('');
  if (!c) return null;
  const set = (i: number, patch: Partial<(typeof rows)[number]>) => setRows(r => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <Modal title="Split into several items" onClose={() => modal(null)}>
      <p className="helper"><q>{captureText(c)}</q><br />Edit the pieces and choose what each one is. The original capture is kept whole, and you can undo this.</p>
      <form onSubmit={e => { e.preventDefault(); const r = C.splitCapture(api.get(), api.ctx, id, rows.map(x => ({ type: x.type, folderId, outcomeId: null, title: x.title }))); if (!r.ok) { setError(r.error); return; } api.run(() => r); modal(null); }}>
        {rows.map((x, i) => (
          <div key={i} className="split-row"><input className="text-input" aria-label={`Piece ${i + 1}`} value={x.title} onChange={e => set(i, { title: e.target.value })} maxLength={200} />
            <select className="select" aria-label={`Type of piece ${i + 1}`} value={x.type} onChange={e => set(i, { type: e.target.value as C.Approval['type'] })}>{(['Task', 'Outcome', 'Decision', 'Idea'] as const).map(t => <option key={t} value={t}>{t}</option>)}</select>
            <button type="button" className="mini-button" aria-label={`Remove piece ${i + 1}`} onClick={() => setRows(r => r.filter((_, j) => j !== i))}>Remove</button></div>))}
        <div className="button-row"><button type="button" className="mini-button" onClick={() => setRows(r => [...r, { title: '', type: 'Task' }])}><Icon name="plus" /> Add a piece</button></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="capture-foot"><span className="small-note">Steps with no matching outcome stay loose.</span><button className="primary-button" type="submit">Split</button></div>
      </form>
    </Modal>
  );
}
