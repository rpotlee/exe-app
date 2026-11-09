import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { statusLine, topActions, type AssistAction, type AssistantState, type Artifact } from '../../src/domain/assistant';
import { useApp } from '../app/context';
import { fromAssist, loadDemo } from '../app/useEntryAssistant';
import { Icon } from './Icon';
import { useDialog } from './Modal';
import { useAiCooldown } from './useAiCooldown';

/** The state the list rows summarize (the same rules the panel uses), so a row's status line and the panel always agree. */
export function useEntryState(id: string, text: string): AssistantState | null {
  const { api, assistantDemo, assistState } = useApp();
  return useMemo(() => (assistantDemo ? loadDemo(id, text) : fromAssist(assistState.items[id], id, text, api.ctx.owner)), [assistantDemo, assistState.items, id, text, api.ctx.owner]);
}
export { statusLine };

/** Visible action count from the width actually available (spec §6.2): never a pile of pills, never a clipped verb. */
function useFit(el: HTMLElement | null): number {
  const [n, setN] = useState(3);
  useLayoutEffect(() => {
    if (!el) return;
    const f = () => { const w = el.clientWidth; setN(w >= 330 ? 3 : w >= 240 ? 2 : 1); };
    f(); const ro = new ResizeObserver(f); ro.observe(el); return () => ro.disconnect();
  }, [el]);
  return n;
}

function ActionRow({ actions, run }: { actions: AssistAction[]; run: (a: AssistAction) => void }) {
  const [el, setEl] = useState<HTMLDivElement | null>(null), fit = useFit(el), [more, setMore] = useState(false);
  const list = topActions({ actions } as AssistantState), visible = list.length > fit ? list.slice(0, fit - 1 >= 1 ? fit - 1 : 1) : list, rest = list.slice(visible.length);
  if (!list.length) return null;
  return (
    <div className="ax-actions" ref={setEl}>
      {visible.map((a, i) => <button key={a.id} className={`ax-btn ${i === 0 ? 'primary' : ''}`} disabled={!!a.disabled} title={a.disabled} onClick={() => run(a)}>{a.label}</button>)}
      {rest.length > 0 && <span className="ax-more-wrap"><button className="ax-btn" aria-haspopup="menu" aria-expanded={more} onClick={() => setMore(m => !m)}>More</button>
        {more && <ul className="ax-more" role="menu">{rest.map(a => <li key={a.id} role="none"><button role="menuitem" disabled={!!a.disabled} onClick={() => { setMore(false); run(a); }}>{a.label}</button></li>)}</ul>}</span>}
    </div>
  );
}

function ArtifactView({ a, onCopy, copied }: { a: Artifact; onCopy: () => void; copied: boolean }) {
  const [full, setFull] = useState(false), long = a.body.length > 320;
  return (
    <section className="ax-artifact" aria-label={a.title}>
      <h3>{a.title}{a.revision > 1 && <span className="ax-rev"> · version {a.revision}</span>}</h3>
      {a.subject && <p className="ax-subject">{a.subject}</p>}
      {a.type === 'checklist' ? <ul className="ax-check">{a.items?.map(it => <li key={it.text}><label><input type="checkbox" /> {it.text}</label></li>)}</ul>
        : a.body && <pre className={`ax-body ${long && !full ? 'clamp' : ''}`}>{a.body}</pre>}
      {long && <button className="ax-link" onClick={() => setFull(f => !f)}>{full ? 'Show less' : 'View full draft'}</button>}
      {a.links && a.links.length > 0 && <ul className="ax-links">{a.links.map(l => <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer">{l.title}</a> <span className="ax-note">{l.label}</span></li>)}</ul>}
      {copied && <p className="ax-note" role="status">Copied to your clipboard. Nothing was sent.</p>}
    </section>
  );
}

export function EntryAssistant({ id, onClose }: { id: string; onClose: () => void }) {
  const { api, assistantAdapter: adapter, assistState, go } = useApp();
  const cap = api.ws.captures.find(c => c.id === id), text = cap ? (cap.edited_text ?? cap.text) : '';
  const wide = typeof matchMedia === 'function' && matchMedia('(min-width: 1100px)').matches;
  const panel = useRef<HTMLDivElement>(null), onKey = useDialog(panel, onClose, { focusFirst: false, modal: !wide });
  const live0 = adapter?.demo ? loadDemo(id, text) : fromAssist(assistState.items[id], id, text, api.ctx.owner);
  const [state, setState] = useState<AssistantState>(() => live0 ?? { demo: !!adapter?.demo, question: null, artifact: null, versions: [], actions: [], turns: [] });
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [retry, setRetry] = useState<(() => void) | null>(null), [stale, setStale] = useState(false);
  const locked = useRef(false), restoreVersion = useRef(0), [prepared, setPrepared] = useState(!!adapter?.demo), [retryAt, setRetryAt] = useState<number | null>(null);
  const wait = useAiCooldown(retryAt);
  const [draft, setDraft] = useState(() => { try { return sessionStorage.getItem(`exe-assistant-draft:${id}`) ?? ''; } catch { return ''; } });
  const [copied, setCopied] = useState(false), [vv, setVv] = useState<{ h: number; t: number } | null>(null), [live, setLive] = useState('');
  const alive = useRef(true); useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  /** Run one assistant operation: show "Preparing…", keep the screen usable, and on failure say so truthfully with a Try again. Nothing is lost. */
  const exec = (fn: () => Promise<AssistantState>, say = 'Updated.') => {
    if (!adapter || wait > 0) return;
    const go1 = async () => { if (locked.current) return; locked.current = true; const version = ++restoreVersion.current; setBusy(true); setErr(''); setRetry(null); try { const next = await fn(); if (alive.current && version === restoreVersion.current) { setState(next); setPrepared(true); setStale(false); setLive(say); } } catch (e) { if (alive.current && version === restoreVersion.current) { setErr((e as Error).message); setRetryAt((e as { retryAt?: number | null }).retryAt ?? null); setRetry(() => go1); setLive('That did not work.'); } } finally { locked.current = false; if (alive.current && version === restoreVersion.current) setBusy(false); } };
    void go1();
  };
  useEffect(() => {   // opening only restores saved work; the server never generates for this operation
    if (!adapter || adapter.demo) return;
    let current = true;
    const run = async () => { const version = ++restoreVersion.current; setBusy(true); setErr(''); try { const r = await adapter.load(id, text); if (alive.current && current && version === restoreVersion.current) { setState(r.state); setStale(r.stale); setPrepared(r.prepared ?? !!(r.state.artifact || r.state.question || r.state.turns.length)); } } catch (e) { if (alive.current && current && version === restoreVersion.current) { setErr((e as Error).message); setRetry(() => run); } } finally { if (alive.current && current && version === restoreVersion.current) setBusy(false); } };
    void run(); return () => { current = false; };
  }, [id, text, adapter]);
  useEffect(() => { document.body.classList.add('assistant-open'); return () => document.body.classList.remove('assistant-open'); }, []);
  useEffect(() => {   // keep the composer above the on-screen keyboard (iOS): follow the visual viewport, never a guessed keyboard height
    const v = window.visualViewport; if (!v) return;
    const f = () => setVv({ h: v.height, t: v.offsetTop }); f(); v.addEventListener('resize', f); v.addEventListener('scroll', f);
    return () => { v.removeEventListener('resize', f); v.removeEventListener('scroll', f); };
  }, []);
  const keep = (v: string) => { setDraft(v); try { sessionStorage.setItem(`exe-assistant-draft:${id}`, v); } catch { /* best effort */ } };
  const run = (a: AssistAction) => {
    if (a.id === 'copy' && state.artifact) {
      const t = [state.artifact.subject, state.artifact.body].filter(Boolean).join('\n\n') || (state.artifact.items?.map(i => `• ${i.text}`).join('\n') ?? '');
      navigator.clipboard.writeText(t).then(() => { setCopied(true); setLive('Copied. Nothing was sent.'); setTimeout(() => setCopied(false), 2500); }).catch(() => setLive('Could not copy. Select the text and copy it yourself.'));
      return;
    }
    if (adapter) exec(() => adapter.act(id, text, a.id));
  };
  const submit = (e: React.FormEvent) => { e.preventDefault(); const t = draft.trim(); if (!t || !adapter || busy || wait > 0) return; exec(async () => { const next = await adapter.send(id, text, t); if (alive.current) keep(''); return next; }); };
  const place = state.artifact ? (state.artifact.type === 'message_draft' ? 'Refine this draft…' : 'Ask about this result…') : 'Ask Exe a follow-up…';
  if (!cap) return null;
  return createPortal(
    <div className={`ax-layer ${wide ? 'wide' : ''}`} onKeyDown={onKey}>
      {!wide && <div className="ax-scrim" onMouseDown={onClose} />}
      <div className="ax-panel" role="dialog" aria-modal={!wide} aria-label={`Assistant for ${text}`} ref={panel} tabIndex={-1} style={vv && !wide ? { height: vv.h, top: vv.t } : undefined}>
        <header className="ax-top"><button className="ax-close" aria-label="Close" data-close onClick={onClose}><Icon name="chevron-left" /></button><span className="ax-title">{text}</span>{state.demo && <span className="ax-demo" title="Keyword rules on this device, not an AI">Demo</span>}</header>
        <div className="ax-body-scroll">
          <section className="ax-entry"><p className="ax-entry-text">{text}</p><p className="ax-meta">{cap.kind === 'note' ? 'Note' : cap.kind === 'reminder' ? 'Reminder' : 'Task'}{cap.completed_at ? ' · Done' : ''}</p></section>
          {state.question && <section className="ax-question" aria-label="One question"><p>{state.question.text}</p>
            <div className={`ax-choices n${state.question.choices.length}`} role="group">{state.question.choices.map(c => <button key={c.id} className="ax-choice" disabled={busy || wait > 0 || stale} onClick={() => adapter && exec(() => adapter.choose(id, text, c.id))}>{c.label}</button>)}</div></section>}
          {state.artifact && <ArtifactView a={state.artifact} onCopy={() => run({ id: 'copy', intent: 'copy', label: 'Copy', kind: 'safe_local', priority: 1 })} copied={copied} />}
          {!busy && adapter && (!prepared || stale) && <div><button className="ax-btn primary" disabled={wait > 0} onClick={() => exec(() => adapter.prepare(id, text), 'Help prepared.')}>{stale ? 'Update help' : 'Prepare help'}</button><p className="ax-note">Uses AI only when you ask. You can also type a question below.</p></div>}
          <ActionRow actions={busy || wait > 0 || stale ? state.actions.filter(a => a.kind === 'safe_local') : state.actions} run={run} />
          {busy && <p className="ax-quiet" role="status">Preparing…</p>}
          {err && <p className="ax-error" role="alert">{err} {retry && <button className="ax-link" disabled={busy || wait > 0} onClick={retry}>{wait ? `Try again in ${wait}s` : 'Try again'}</button>}</p>}
          {!busy && !err && !state.question && !state.artifact && !state.actions.length && <p className="ax-quiet">{prepared ? 'No additional help needed for this entry. You can still ask a question.' : 'Saved help appears here. Browsing does not use AI.'}</p>}
          {stale && state.artifact && <p className="ax-note">Prepared for an earlier version of this task.</p>}
          {state.note && <p className="ax-note">{state.note}</p>}
          {state.turns.length > 0 && <details className="ax-history"><summary>Conversation ({state.turns.length})</summary><ol>{state.turns.map(t => <li key={t.id} className={t.role}><strong>{t.role === 'user' ? 'You' : 'Exe'}</strong> {t.text}</li>)}</ol></details>}
          <button className="ax-link" onClick={() => { onClose(); go('review'); }}>Activity</button>
          <div className="sr-only" role="status" aria-live="polite">{live}</div>
        </div>
        <form className="ax-composer" onSubmit={submit}>
          <textarea aria-label="Ask Exe" rows={1} placeholder={adapter ? place : 'Turn on AI in Settings to ask follow-ups'} disabled={!adapter || busy || wait > 0} value={draft} maxLength={2000}
            onChange={e => { keep(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia('(min-width: 761px)').matches) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
          <button type="submit" className="ax-send" aria-label="Send" disabled={!adapter || busy || wait > 0 || !draft.trim()}><Icon name="arrow-up" /></button>
        </form>
      </div>
    </div>, document.body);
}
