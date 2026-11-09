import type { AssistItem } from './ai';
import { emptyState, type AssistantState, type Artifact } from '../../src/domain/assistant';
import { evaluate } from './demoAssistant';
import { cachedState } from './assistantApi';

const key = (id: string) => `exe-assistant-demo:${id}`;
/** Demo assistant state for an entry: what was saved on this device, else what the demo rules say about the text. Device-only, labeled Demo. */
export function loadDemo(id: string, text: string): AssistantState {
  try { const raw = localStorage.getItem(key(id)); if (raw) { const j = JSON.parse(raw) as { text: string; state: AssistantState }; if (j.text === text) return j.state; } } catch { /* start fresh */ }
  return evaluate(text);
}
export function saveDemo(id: string, text: string, state: AssistantState): void { try { localStorage.setItem(key(id), JSON.stringify({ text, state })); } catch { /* device storage is best effort */ } }

/** Saved per-entry work, with read-only compatibility for older batch-prepared results. */
export function fromAssist(item: AssistItem | undefined, id?: string, text?: string, owner?: string): AssistantState | null {
  const saved = id ? cachedState(id, text, owner) : null; if (saved) return saved;
  if (!item) return null;
  const s = emptyState(false);
  let a: Artifact | null = null;
  if (item.email) a = { id: 'real-email', type: 'message_draft', title: 'Email draft', subject: item.email.subject, body: item.email.body, revision: 1 };
  else if (item.answer) a = { id: 'real-answer', type: 'answer', title: 'Answer', body: item.answer.text, revision: 1, links: item.answer.sourceDomain ? [{ title: item.answer.sourceTitle || item.answer.sourceDomain, url: `https://www.google.com/search?q=${encodeURIComponent(`site:${item.answer.sourceDomain}`)}`, label: 'Search this site' }] : [] };
  else if (item.research) a = { id: 'real-sources', type: 'sources', title: 'Where to look', body: item.research.topic, revision: 1, links: item.research.sources.map(r => ({ title: r.title, url: `https://www.google.com/search?q=${encodeURIComponent(`site:${r.domain} ${r.query || item.research!.topic}`)}`, label: 'Search this site' })) };
  if (!a) return null;
  s.artifact = a; s.actions = a.type === 'message_draft' ? [{ id: 'copy', intent: 'copy', label: 'Copy', kind: 'safe_local', priority: 1 }] : [];
  s.note = 'Prepared earlier. Open this entry to ask for new help.';
  return s;
}
