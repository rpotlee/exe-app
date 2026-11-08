import { useState } from 'react';
import * as C from '../../src/domain/commands';
import { captureText, duplicateOf, needsPlacement, pendingCaptures, propose, proposalFingerprint, rejectedBefore, setAside, type Proposal, type ProposalType } from '../../src/domain/review';
import type { Capture } from '../../src/domain/model';
import { useApp } from '../app/context';
import { PageHeading } from '../app/Heading';
import { Icon } from '../ui/Icon';

const TYPES: ProposalType[] = ['Task', 'Outcome', 'Decision', 'Idea', 'Note'];

/** AI Review. A SIMULATION: simple local keyword rules, not an AI model. Every action asks; nothing is applied silently. */
export function Review() {
  const { api, go, modal } = useApp();
  const ws = api.ws, [edits, setEdits] = useState<Record<string, Partial<Proposal>>>({});
  const pending = pendingCaptures(ws), aside = setAside(ws);
  const recent = ws.captures.filter(c => c.status === 'organized' && c.organized_as && c.organized_as !== 'Merged').slice(-5).reverse();
  const merged = (id: string) => ws.captures.some(x => x.merged_into === id);
  const prop = (c: Capture): Proposal => ({ ...propose(ws, c), ...edits[c.id] });
  const edit = (id: string, patch: Partial<Proposal>) => setEdits(e => ({ ...e, [id]: { ...e[id], ...patch } }));
  const toApproval = (p: Proposal): C.Approval => ({ type: p.type, folderId: p.folderId, outcomeId: p.outcomeId, title: p.title });

  const approve = (c: Capture) => { const p = prop(c); if (needsPlacement(p)) modal({ kind: 'placement', id: c.id, folderId: p.folderId, mergeWith: null }); else api.run((w, cx) => C.approveCapture(w, cx, c.id, toApproval(p))); };
  const approveAll = () => {
    const todo = pending.filter(c => !rejectedBefore(c, prop(c))); let loose = 0;
    for (const c of todo) { const before = api.get(); if (api.run((w, cx) => { const cap = w.captures.find(x => x.id === c.id); if (!cap) return { ok: false as const, error: '' }; const p = { ...propose(w, cap), ...edits[c.id] }; return C.approveCapture(w, cx, c.id, toApproval(p)); }) && needsPlacement(propose(before, c))) loose++; }
    api.flash(`${todo.length} ${todo.length === 1 ? 'capture' : 'captures'} organized. Originals preserved.${loose ? ` ${loose} ${loose === 1 ? 'step' : 'steps'} left loose; place them from the Map.` : ''}`);
  };

  return (
    <>
      <PageHeading label="AI REVIEW" title="AI Review" sub="Approve organization deliberately. This version uses local keyword rules (a simulation), not a live AI model."
        extra={<div className="page-tools">{pending.length > 0 && <button className="primary-button" onClick={approveAll}><Icon name="check-check" /> Approve all ({pending.length})</button>}<button className="quiet-button" onClick={() => go('inbox')}>Back to inbox</button></div>} />
      <div className="review-layout">
        <section className="stack">
          {pending.length ? pending.map(c => {
            const p = prop(c), dup = duplicateOf(ws, c), again = rejectedBefore(c, p);
            return (
              <article key={c.id} className="card review-item">
                <div className="row-between"><span className="review-tag">ORIGINAL CAPTURE</span><span className="pill blue">Unapproved</span></div>
                <p className="review-original">{captureText(c)}</p>
                <div className="review-fields">
                  <div className="form-field"><label htmlFor={`type-${c.id}`}>Suggested type</label><select className="select" id={`type-${c.id}`} value={p.type} onChange={e => edit(c.id, { type: e.target.value as ProposalType })}>{TYPES.map(t => <option key={t} value={t}>{t === 'Note' ? 'Just a note' : t}</option>)}</select></div>
                  <div className="form-field"><label htmlFor={`folder-${c.id}`}>Suggested folder</label><select className="select" id={`folder-${c.id}`} value={p.folderId ?? ''} onChange={e => edit(c.id, { folderId: e.target.value || null })}><option value="">Not filed</option>{ws.folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
                </div>
                <div className="review-reason"><Icon name="lightbulb" /> <span>{p.outcomeId ? 'Possibly related to existing work. Review the relationship before consolidating.' : 'Initial classification inferred from keywords. Please verify before applying.'}</span></div>
                {again && <p className="form-error" role="status">You rejected this exact suggestion before. Change the type or folder to approve it.</p>}
                {dup && <div className="review-dup"><strong>Possible duplicate.</strong> This looks like another capture waiting for review: <q>{captureText(dup)}</q> <button className="mini-button" onClick={() => modal({ kind: 'mergePreview', id: c.id, otherId: dup.id, folderId: p.folderId, type: p.type })}>Preview merge</button></div>}
                <div className="action-line"><button className="primary-button" disabled={again} onClick={() => approve(c)}><Icon name="check" /> Approve &amp; organize</button>
                  <button className="mini-button" onClick={() => api.run((w, cx) => C.deferCapture(w, cx, c.id))}>Not now</button>
                  <button className="mini-button" onClick={() => api.run((w, cx) => C.rejectCapture(w, cx, c.id, proposalFingerprint(p)))}>Reject</button></div>
              </article>); })
            : <div className="empty-state"><span className="empty-icon"><Icon name="sparkles" /></span><h2>Nothing to review.</h2><p>New captures appear here for your approval. The app never silently rewrites your priorities.</p></div>}
          {aside.length > 0 && <section className="card review-aside" aria-label="Set aside"><h3 className="section-heading">Set aside ({aside.length})</h3><p className="small-note">Not deleted. The capture and its suggestion are kept.</p>
            {aside.map(c => <div key={c.id} className="aside-row"><span className="aside-text">{captureText(c)}<small>{c.review_state === 'rejected' ? 'Rejected' : 'Not now'}</small></span><button className="mini-button" aria-label={`Review again: ${captureText(c)}`} onClick={() => api.run(w => C.reviewAgain(w, c.id))}>Review again</button></div>)}</section>}
          {recent.length > 0 && <section className="card review-aside" aria-label="Recently approved"><h3 className="section-heading">Recently approved</h3><p className="small-note">You can undo an approval until you have worked on what it created. The original capture always stays.</p>
            {recent.map(c => <div key={c.id} className="aside-row"><span className="aside-text">{captureText(c)}<small>Approved as {c.organized_as === 'Note' ? 'a note' : c.organized_as}{merged(c.id) ? ' (merged with another capture)' : ''}</small></span><button className="mini-button" aria-label={`Undo approval: ${captureText(c)}`} onClick={() => api.run((w, cx) => C.undoApproval(w, cx, c.id))}>Undo</button></div>)}</section>}
        </section>
        <aside className="card review-summary"><h3>Designed to protect your focus</h3><p>This version makes simple local suggestions and keeps your originals. A real AI service, with your own key, comes later.</p>
          <div className="recommendation"><span className="review-tag">REVIEW RULES</span><p>Suggest, then you approve. Nothing enters Now automatically, and nothing is deleted.</p></div></aside>
      </div>
    </>
  );
}
