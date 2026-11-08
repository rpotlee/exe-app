import { useState, type FormEvent } from 'react';
import * as C from '../../src/domain/commands';
import { computeSuggestion, activeIds } from '../../src/domain/engine';
import { entityName } from '../../src/domain/blocking';
import type { RelationshipKind } from '../../src/domain/model';
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { stepsOf, progressOf } from '../../src/domain/progress';
import { captureText, propose } from '../../src/domain/review';
import { CheckRow } from '../ui/CheckRow';
import { Icon } from '../ui/Icon';
import { Modal, useDialog } from '../ui/Modal';
import { useApp, type ModalState } from './context';

const val = (f: FormData, k: string): string => String(f.get(k) ?? '');
const orNull = (s: string): string | null => (s ? s : null);
const DRAFT = 'exe-capture-draft';

export function Dialogs({ m }: { m: ModalState }) {
  switch (m.kind) {
    case 'capture': return <CaptureSheet />;
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
  const { api, modal, where } = useApp();
  const ws = api.ws;
  const [name, setName] = useState(ws.settings?.workspace_name ?? '');
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
      <form onSubmit={e => { e.preventDefault(); const d = new FormData(e.currentTarget); const before = api.get(); const r = C.editTask(before, id, { name: val(d, 'name'), outcomeId: orNull(val(d, 'outcome')) }); if (!r.ok) { setError(r.error); return; } api.run(() => r); modal(null); }}>
        <label className="form-field"><span className="small-note">Step</span><input className="text-input" name="name" required maxLength={200} defaultValue={t.name} /></label>
        <label className="form-field"><span className="small-note">Outcome</span><select className="select" name="outcome" defaultValue={t.outcome_id ?? ''}><option value="">No outcome (loose step)</option>{ws.outcomes.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
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
        <div className="focus-actions"><span className="small-note">New thoughts go to Inbox, not your active work.</span><button className="quiet-button" onClick={close}>Finish session <Icon name="check" /></button></div></div>
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
      <form onSubmit={e => { e.preventDefault(); const r = C.renameOption(api.get(), api.ctx, id, val(new FormData(e.currentTarget), 'option')); if (!r.ok) { setError(r.error); return; } api.run(() => r); modal(null); }}>
        <input className="text-input" name="option" required maxLength={160} defaultValue={o.text} aria-label="Option text" />
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
