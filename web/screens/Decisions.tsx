import { useState } from 'react';
import { followUpsOf, optionsOf, reopenDecision, setDecisionText } from '../../src/domain/commands';
import { entityName } from '../../src/domain/blocking';
import { rankDecisions } from '../../src/domain/insight';
import { useApp } from '../app/context';
import { PageHeading } from '../app/Heading';
import { Icon } from '../ui/Icon';

const stamp = (iso: string) => { try { return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch { return ''; } };
const LABEL: Record<string, string> = { created: 'Created', edited: 'Edited', resolved: 'Resolved', reopened: 'Reopened' };

export function Decisions() {
  const { api, modal, go, decisionSel, setDecisionSel } = useApp();
  const ws = api.ws, [pickerOpen, setPickerOpen] = useState(false);
  const ranked = rankDecisions(ws), d = ws.decisions.find(x => x.id === decisionSel) ?? ranked[0]?.decision ?? null;
  const heldBy = (id: string) => ranked.find(r => r.decision.id === id)?.held ?? [];
  const open = ws.decisions.filter(x => x.status === 'open').length;
  const opts = d ? optionsOf(ws, d.id) : [], log = d ? ws.decisionLog.filter(l => l.decision_id === d.id).slice().sort((a, b) => b.at.localeCompare(a.at)) : [];
  const deps = d && d.status === 'resolved' ? followUpsOf(ws, d.id) : [];
  const folder = (id: string | null) => ws.folders.find(f => f.id === id)?.name ?? 'Not filed';
  return (
    <>
      <PageHeading label="DECISION QUEUE" title="Decisions" sub="Separate unresolved questions from executable work." extra={<div className="page-tools"><span className="pill blue">{open} open</span><button className="quiet-button" onClick={() => modal({ kind: 'decisionForm', id: null })}><Icon name="plus" /> New decision</button></div>} />
      <div className="decisions-layout">
        <nav className={`card decision-list ${pickerOpen ? 'open' : ''}`} data-picker aria-label="Decisions">
          {ranked.map(({ decision: c, held }) => (
            <button key={c.id} className={`decision-item ${c.id === d?.id ? 'active' : ''}`} aria-pressed={c.id === d?.id} onClick={() => { if (c.id === d?.id) setPickerOpen(o => !o); else { setDecisionSel(c.id); setPickerOpen(false); } }}>
              <strong>{c.name}</strong><small>{folder(c.folder_id)} · {c.status === 'open' ? 'Unresolved' : 'Resolved'}{c.status === 'open' && held.length > 0 ? ` · holding up ${held.length}` : ''}</small><Icon name="chevron-right" className="chevron" /></button>))}
        </nav>
        <section className="card decision-detail">
          {d ? <>
            <div className="row-between"><div className="eyebrow">DECISION</div><span className={`pill ${d.status === 'open' ? 'amber' : 'green'}`}>{d.status === 'open' ? 'Unresolved' : 'Resolved'}</span></div>
            <h2>{d.name}</h2><p className="small-note">{d.description}</p>
            {d.status === 'open' && heldBy(d.id).length > 0 && <p className="impact-line" role="status"><Icon name="lock" /> Holding up {heldBy(d.id).length} {heldBy(d.id).length === 1 ? 'item' : 'items'} you confirmed: {heldBy(d.id).map(i => entityName(ws, i)).join(', ')}.</p>}
            <div className="action-line"><button className="mini-button" onClick={() => modal({ kind: 'decisionForm', id: d.id })}><Icon name="edit-3" /> Edit question</button></div>
            <div className="detail-block"><h3>Options to consider</h3>
              {opts.length ? <div className="option-row">{opts.map(o => { const chosen = d.status === 'resolved' && d.chosen_option === o.text; return (
                <button key={o.id} type="button" className={`option-tag option-edit ${chosen ? 'chosen' : ''}`} aria-label={`Edit option: ${o.text}${chosen ? ' (chosen)' : ''}`} onClick={() => modal({ kind: 'optionEdit', id: o.id })}>{chosen && <Icon name="check" />}{o.text}</button>); })}</div> : <p className="small-note">Add possibilities as you research.</p>}
              <div className="action-line"><button className="mini-button" onClick={() => modal({ kind: 'optionAdd', decisionId: d.id })}><Icon name="plus" /> Add option</button></div></div>
            <div className="detail-block"><h3>What matters to you (criteria)</h3>
              <textarea key={d.id + 'c'} className="text-area" aria-label="Criteria" placeholder="For example: budget, time, risk, what you would regret." defaultValue={d.criteria} onBlur={e => { if (e.target.value !== d.criteria) api.run(w => setDecisionText(w, d.id, 'criteria', e.target.value)); }} /></div>
            {opts.length >= 2 && opts.some(o => o.pros || o.cons) && <div className="detail-block"><h3>Side by side</h3><div className="compare-wrap" tabIndex={0} role="region" aria-label="Option comparison (scrolls sideways)"><table className="compare"><caption className="small-note">Your own notes, laid out together. Exe does not score or rank options for you.</caption>
              <thead><tr><th scope="col"><span className="sr-only">Notes</span></th>{opts.map(o => <th scope="col" key={o.id}>{o.text}</th>)}</tr></thead>
              <tbody><tr><th scope="row">Good</th>{opts.map(o => <td key={o.id}>{o.pros || <span className="small-note">Nothing written</span>}</td>)}</tr><tr><th scope="row">Not so good</th>{opts.map(o => <td key={o.id}>{o.cons || <span className="small-note">Nothing written</span>}</td>)}</tr></tbody></table></div></div>}
            <div className="detail-block"><h3>Evidence</h3>
              <textarea key={d.id + 'e'} className="text-area" aria-label="Evidence" placeholder="Facts and sources you have checked. Keep guesses in your notes." defaultValue={d.evidence} onBlur={e => { if (e.target.value !== d.evidence) api.run(w => setDecisionText(w, d.id, 'evidence', e.target.value)); }} />
              <p className="small-note" style={{ marginTop: 8 }}>Evidence is separate from notes. Nothing is added for you.</p></div>
            <div className="detail-block"><h3>Research and notes</h3>
              <textarea key={d.id + 'n'} className="text-area" aria-label="Research notes" placeholder="What would help you decide?" defaultValue={d.notes} onBlur={e => { if (e.target.value !== d.notes) api.run(w => setDecisionText(w, d.id, 'notes', e.target.value)); }} />
              <p className="small-note" style={{ marginTop: 8 }}>Saved with your workspace. Decisions never automatically reassign priorities.</p></div>
            {d.conclusion && <div className="detail-block"><h3>{d.status === 'resolved' ? 'Recorded conclusion' : 'Previous conclusion (reopened)'}</h3>
              <p className="small-note">{d.chosen_option && <><strong>Chosen option:</strong> {d.chosen_option}<br /></>}{d.conclusion}{d.rationale && <><br /><strong>Why:</strong> {d.rationale}</>}{d.resolved_at && d.status === 'resolved' && <><br /><span className="log-time">Resolved {stamp(d.resolved_at)}</span></>}</p></div>}
            <div className="detail-block"><h3>Decision status</h3>
              <div className="button-row">{d.status === 'open' ? <button className="primary-button" onClick={() => modal({ kind: 'resolve', id: d.id })}><Icon name="check-circle" /> Mark resolved</button> : <button className="quiet-button" onClick={() => api.run((w, c) => reopenDecision(w, c, d.id))}><Icon name="rotate-ccw" /> Reopen decision</button>}</div>
              {deps.length > 0 && <div className="followup" role="status"><strong>Suggested follow-up</strong><p className="small-note">{deps.length === 1 ? '1 item was held up by this decision' : `${deps.length} items were held up by this decision`} and may now be actionable. Nothing has been changed; review {deps.map(i => entityName(ws, i)).join(', ')} in the <button className="link-button" onClick={() => go('map')}>Map</button>.</p></div>}</div>
            <div className="detail-block"><h3>Decision log</h3>{log.length ? <ol className="decision-log">{log.map(l => <li key={l.id}><span className="log-time">{stamp(l.at)}</span> <strong>{LABEL[l.type] ?? l.type}</strong>{l.text ? `: ${l.text}` : ''}</li>)}</ol> : <p className="small-note">Changes you make are recorded here with the date.</p>}</div>
          </> : <div className="empty-state"><h2>No decisions yet</h2><p>Add the first question you need to settle.</p></div>}
        </section>
      </div>
    </>
  );
}
