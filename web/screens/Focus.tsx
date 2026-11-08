import { useMemo, useState } from 'react';
import { ignoreSuggestion, selectCurrentFocus } from '../../src/domain/commands';
import { activeIds, computeSuggestion } from '../../src/domain/engine';
import { blockedCount } from '../../src/domain/blocking';
import { currentFocusId, type Outcome, type Workspace } from '../../src/domain/model';
import { progressOf, stepsOf } from '../../src/domain/progress';
import { useApp } from '../app/context';
import { MobileTopline } from '../app/Heading';
import { CheckRow } from '../ui/CheckRow';
import { Icon } from '../ui/Icon';

const folderOf = (ws: Workspace, o: Outcome) => ws.folders.find(f => f.id === o.folder_id)?.name ?? 'Not filed';

function HeroStat({ ws, id }: { ws: Workspace; id: string }) {
  const p = progressOf(ws, id), pct = p.percent ?? 0;
  const ticks = p.total > 1 && p.total <= 12 ? Array.from({ length: p.total - 1 }, (_, n) => <i key={n} className="tick" style={{ left: `${(((n + 1) / p.total) * 100).toFixed(2)}%` }} />) : null;
  return (
    <div className="hero-stat" role="img" aria-label={p.total ? `${pct}% complete, ${p.done} of ${p.total} steps` : 'No steps yet, progress is not measured'}>
      <div className="hero-ring" aria-hidden="true"><svg viewBox="0 0 44 44"><circle className="ring-track" cx="22" cy="22" r="19" /><circle className="ring-fill" cx="22" cy="22" r="19" style={{ strokeDasharray: `${((119.38 * pct) / 100).toFixed(2)} 119.38` }} /></svg><strong>{p.total ? `${p.done} of ${p.total}` : '—'}</strong></div>
      <div className="hero-track" aria-hidden="true"><span className="fill" style={{ '--pct': pct, '--pbg': Math.max(pct, 1) } as React.CSSProperties} />{ticks}</div>
      <div className="hero-cap">{p.total ? <><span>{p.label}</span><strong>{pct}%</strong></> : <span>Not measured</span>}</div>
    </div>
  );
}

export function Focus() {
  const { api, go, modal, awaitingReview } = useApp();
  const ws = api.ws, ids = activeIds(ws), stored = currentFocusId(ws);
  const currentId = stored && ids.includes(stored) ? stored : ids[0] ?? null;
  const current = ws.outcomes.find(o => o.id === currentId) ?? null;
  const others = ids.filter(i => i !== currentId).map(i => ws.outcomes.find(o => o.id === i)).filter((o): o is Outcome => !!o);
  const [expanded, setExpanded] = useState(false);
  const [deferred, setDeferred] = useState('');
  const sg = useMemo(() => computeSuggestion(ws), [ws]);
  const dismissed = ws.settings?.priority_dismissed ?? [];
  const showSg = !!sg && !dismissed.includes(sg.fingerprint) && sg.fingerprint !== deferred;
  const blocked = blockedCount(ws);
  const empty = ws.outcomes.length === 0 && ws.captures.length === 0;

  const steps = current ? stepsOf(ws, current.id) : [], firstOpen = steps.find(t => t.done_at === null), nextStep = firstOpen ?? steps[0];
  const nx = ws.focus.filter(f => f.lane === 'next').length, lt = ws.focus.filter(f => f.lane === 'later').length;
  const openSlots = 3 - ids.length;
  const note = openSlots > 0 && nx + lt > 0 ? `${openSlots} Now ${openSlots === 1 ? 'slot is' : 'slots are'} open. Choose what to bring in from Next & Later; nothing is added for you.`
    : sg && !showSg && dismissed.includes(sg.fingerprint) ? 'Nothing new since you ignored the last suggestion.' : sg && !showSg ? 'A suggestion is waiting. It returns after your next change.' : 'No change suggested. Your active priorities already match the rules.';

  return (
    <>
      <MobileTopline />
      <div className="mission-heading">
        <div className="eyebrow mission-eyebrow">{(ws.settings?.workspace_name || 'My workspace').toUpperCase()}</div>
        <h1>Mission Status</h1>
        <p className="mission-sub" id="status-line">
          {empty ? 'Nothing here yet.' : <>
            {currentId && <span>1 current focus of up to 3 active.</span>}
            {awaitingReview > 0 && <button className="mission-review" onClick={() => go('review')}>{awaitingReview} awaiting AI Review <Icon name="arrow-right" /></button>}
            {blocked > 0 && <span>{blocked} blocked.</span>}
            {!currentId && awaitingReview === 0 && blocked === 0 && <span>Nothing active right now.</span>}</>}
        </p>
      </div>
      <div className="mission-layout">
        {current ? (
          <div className="hero-stack"><section className="priority-hero" aria-labelledby="current-priority-title">
            <div className="hero-head"><div className="hero-heading"><div className="hero-icon"><Icon name="layers" /></div><div className="hero-copy"><div className="overline">CURRENT PRIORITY</div><h2 id="current-priority-title">{current.name}</h2><div className="type-label">{folderOf(ws, current)}</div></div></div></div>
            <HeroStat ws={ws} id={current.id} />
            <div className="hero-checks desktop-checks">{steps.map(t => <CheckRow key={t.id} task={t} next={t.id === firstOpen?.id} />)}{!steps.length && <p className="small-note">No checklist steps added yet.</p>}</div>
            <div className={`hero-checks mobile-checks ${expanded ? 'expanded' : ''}`} id="mobile-steps">
              {nextStep ? <><div className="step-eyebrow">{steps.every(t => t.done_at !== null) ? 'All steps done' : 'Next step'}</div><CheckRow task={nextStep} next /></> : <p className="small-note">No checklist steps added yet.</p>}
              {steps.length > 1 && <><button className="show-steps" type="button" aria-expanded={expanded} aria-label={expanded ? 'Show only the next step' : 'Show all checklist steps'} onClick={() => setExpanded(e => !e)}><span>All steps</span><span className="step-count">{steps.length}</span><Icon name="chevron-down" /></button>
                <div className="mobile-more-steps">{steps.filter(t => t.id !== nextStep?.id).map(t => <CheckRow key={t.id} task={t} />)}</div></>}
            </div>
            <div className="hero-bottom"><button className="primary-button" onClick={() => modal({ kind: 'focusMode', id: current.id })}><Icon name="crosshair" /> Enter Focus Mode <span className="desktop-cta-arrow"><Icon name="chevron-right" /></span></button></div>
          </section></div>
        ) : empty ? (
          <div className="empty-state"><span className="empty-icon"><Icon name="target" /></span><h2>Nothing here yet</h2><p>Capture a thought with the + button, or make a folder and an outcome in Map. Nothing is added for you.</p><div className="button-row"><button className="primary-button" onClick={() => go('map')}>Open Map</button></div></div>
        ) : (
          <div className="empty-state"><span className="empty-icon"><Icon name="target" /></span><h2>No active priorities</h2><p>Choose an outcome from Next &amp; Later when you're ready.</p></div>
        )}
        <section className="mission-other" aria-label="Other active priorities"><div className="mission-other-head"><div className="mission-other-heading">Other active priorities</div></div>
          <div className="side-priorities">{others.map(o => { const p = progressOf(ws, o.id); return (
            <button key={o.id} type="button" className="priority-mini" aria-pressed={false} onClick={() => api.run((w, c) => selectCurrentFocus(w, c, o.id))}>
              <span className="mini-icon"><Icon name="layers" /></span><span className="mini-copy"><strong className="mini-title">{o.name}</strong><span className="mini-kicker">{folderOf(ws, o)}</span></span>
              <span className="mini-progress">{p.percent ? <><strong>{p.percent}%</strong><span className="mini-progress-track"><span style={{ width: `${p.percent}%` }} /></span></> : <span className="mini-idle">{p.total ? 'Not started' : 'Not measured'}</span>}</span>
              <Icon name="chevron-right" className="mini-arrow" /></button>); })}{!others.length && <p className="small-note">No other active priorities.</p>}</div></section>
        {ws.outcomes.length > 0 && (
          <section className="mission-suggest" aria-label="Priority suggestions">
            {showSg && sg ? (
              <div className="suggest-card card"><div className="overline">PRIORITY SUGGESTION</div><h2 className="suggest-title">A change to your active priorities</h2>
                <ul className="suggest-list">{sg.changes.map(c => (<li key={c.add} className="suggest-change"><p className="suggest-what">{c.remove ? <>Move <strong>{ws.outcomes.find(o => o.id === c.add)?.name}</strong> into Now, replacing <strong>{ws.outcomes.find(o => o.id === c.remove)?.name}</strong>.</> : <>Add <strong>{ws.outcomes.find(o => o.id === c.add)?.name}</strong> to an open Now slot.</>}</p><p className="suggest-why"><span>Why:</span> {c.why}</p></li>))}</ul>
                <p className="small-note">Suggestion only. Nothing changes until you apply it. Rules, in order: pinned, not blocked, earliest deadline, unlocks the most work, has a ready step, most recently worked on.</p>
                <div className="action-line"><button className="primary-button" onClick={() => modal({ kind: 'priority' })}><Icon name="check" /> Apply…</button>
                  <button className="mini-button" onClick={() => api.run((w, c) => ignoreSuggestion(w, c, sg.fingerprint))}>Ignore</button>
                  <button className="mini-button" onClick={() => setDeferred(sg.fingerprint)}>Defer</button></div></div>
            ) : <div className="suggest-quiet"><p className="small-note" role="status">{note}</p></div>}
          </section>)}
        {ws.outcomes.length > 0 && (
          <section className="mission-lanes" aria-label="Next and Later"><button type="button" className="priority-mini lanes-link" onClick={() => go('lanes')}>
            <span className="mini-icon"><Icon name="layers" /></span><span className="mini-copy"><strong className="mini-title">Next &amp; Later</strong><span className="mini-kicker">{nx} next · {lt} later</span></span><Icon name="chevron-right" className="mini-arrow" /></button></section>)}
      </div>
    </>
  );
}
