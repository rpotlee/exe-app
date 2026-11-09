import { useState } from 'react';
import { useApp } from '../app/context';
import { indicator, type HelpWant } from '../app/assistEngine';
import { Icon } from './Icon';

/** The quiet indicator on a row. Nothing shows unless there is real, current help (or an honest offer). */
export function HelpChip({ id, open, onToggle }: { id: string; open: boolean; onToggle: () => void }) {
  const { help } = useApp();
  const r = help.get(id);
  const label = indicator(r);
  if (!label) return null;
  return <button type="button" className={`help-chip ${r?.stale ? 'is-stale' : ''}`} aria-expanded={open} aria-controls={`help-${id}`} onClick={onToggle}>
    <Icon name="sparkles" />{r?.stale ? 'Out of date' : label}</button>;
}

const WANT_FOR = { draft: 'draft', quick_answer: 'answer', research_offer: 'research', breakdown_offer: 'steps', preparation: 'prep' } as const;
const ASK_LABEL: Record<HelpWant, string> = { draft: 'Write a draft', answer: 'Get an answer', research: 'Suggest searches', steps: 'Suggest steps', prep: 'Prepare questions' };

/** The expanded help for one entry. Everything here is a suggestion kept on this device; nothing is sent, booked or changed. */
export function HelpPanel({ id, text }: { id: string; text: string }) {
  const { help } = useApp();
  const [copied, setCopied] = useState(false);
  const r = help.get(id), st = help.status();
  if (!r) return null;
  const want = r.kind !== 'none' ? WANT_FOR[r.kind] : undefined;
  const copy = async (s: string) => { try { await navigator.clipboard.writeText(s); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* clipboard blocked: the text is still selectable */ } };
  const generated = !!(r.draft || r.answer || r.prep?.length || r.steps?.length || r.queries?.length);
  return (
    <section className="help-panel" id={`help-${id}`} aria-label={`AI help for ${text}`}>
      {r.stale && <p className="help-note">Made for an earlier version of this entry.</p>}
      {r.draft && <div className="help-block"><p className="help-label">Draft{r.draft.subject ? ` · ${r.draft.subject}` : ''}</p>
        <textarea className="text-input help-draft" aria-label={`Draft for ${text}`} value={r.draft.body} onChange={e => help.editDraft(id, e.target.value)} rows={5} />
        <button type="button" className="mini-button" onClick={() => copy(r.draft!.subject ? `${r.draft!.subject}\n\n${r.draft!.body}` : r.draft!.body)}>{copied ? 'Copied. Not sent.' : 'Copy'}</button></div>}
      {r.answer && <div className="help-block"><p className="help-label">Answer</p><p>{r.answer.text}</p>{r.answer.unsure && <p className="help-note">Not certain. Check a reliable source before relying on it.</p>}</div>}
      {r.prep?.length ? <div className="help-block"><p className="help-label">Questions to ask</p><ul>{r.prep.map(p => <li key={p}>{p}</li>)}</ul></div> : null}
      {r.steps?.length ? <div className="help-block"><p className="help-label">Suggested steps (not added to your list)</p><ol>{r.steps.map(p => <li key={p}>{p}</li>)}</ol></div> : null}
      {r.queries?.length ? <div className="help-block"><p className="help-label">Searches you could run</p><p className="help-note">Research has not run. These are suggestions, not verified sources.</p>
        <ul>{r.queries.map(q => <li key={q}><a href={`https://duckduckgo.com/?q=${encodeURIComponent(q)}`} target="_blank" rel="noopener noreferrer">{q}</a></li>)}</ul></div> : null}
      {!generated && r.kind === 'research_offer' && <p className="help-note">Research has not run. Exe can suggest what to search for.</p>}
      <div className="help-actions">
        {st.ready && want && (!generated || r.stale) && <button type="button" className="mini-button" disabled={r.busy} onClick={() => help.ask(id, want)}>{r.busy ? 'Working…' : ASK_LABEL[want]}</button>}
        {st.ready && r.stale && !want && <button type="button" className="mini-button" disabled={r.busy} onClick={() => help.ask(id)}>Refresh</button>}
        <button type="button" className="quiet-button" onClick={() => help.dismiss(id)}>Dismiss</button>
      </div>
      {st.error && r.busy === false && <p className="help-note" role="status">{st.error}</p>}
    </section>
  );
}

/** "Ask Exe" on any entry, even ones the rules skipped. Disabled with a reason when AI is off. */
export function AskExe({ id, onAsked }: { id: string; onAsked: () => void }) {
  const { help } = useApp();
  const st = help.status(), r = help.get(id);
  if (!st.ready) return <button type="button" className="mini-button" disabled title="Turn on AI in Settings to ask Exe">Ask Exe</button>;
  return <button type="button" className="mini-button" disabled={!!r?.busy} onClick={() => { onAsked(); void help.ask(id); }}>{r?.busy ? 'Asking…' : 'Ask Exe'}</button>;
}
