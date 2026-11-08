// AI Review, SIMULATION: local keyword rules, not an AI model (the real AI arrives with the backend and the user's own key).
// Everything here only PROPOSES. Nothing is applied until the user approves (commands.ts).
import type { Capture, Workspace } from './model';

export type ProposalType = 'Task' | 'Outcome' | 'Decision' | 'Idea' | 'Note';
export interface Proposal { type: ProposalType; folderId: string | null; outcomeId: string | null; title: string }

const wordCache = new Map<string, Set<string>>();   // review compares many pairs; compute each text's words once
const words = (t: string): Set<string> => { let w = wordCache.get(t); if (!w) { w = new Set(t.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []); if (wordCache.size > 5000) wordCache.clear(); wordCache.set(t, w); } return w; };
export function similarity(a: string, b: string): number {
  const x = words(a), y = words(b); if (x.size < 3 || y.size < 3) return 0;
  let n = 0; x.forEach(w => { if (y.has(w)) n++; });
  return n / (x.size + y.size - n);
}
export const captureText = (c: Capture): string => c.edited_text ?? c.text;

/** A capture waits in the review list until the user acts on it. */
export const isPending = (c: Capture): boolean => c.status === 'pending' && !c.review_state;
export const pendingCaptures = (ws: Workspace): Capture[] => ws.captures.filter(isPending);
export const setAside = (ws: Workspace): Capture[] => ws.captures.filter(c => c.status === 'pending' && c.review_state);

export function propose(ws: Workspace, c: Capture): Proposal {
  const text = captureText(c), s = text.toLowerCase();
  let type: ProposalType = 'Task';
  if (/\b(idea|maybe|worthwhile|explore|creative|consider|possibly)\b/.test(s)) type = 'Idea';
  else if (/\?|should we|do we need|which one|choose between|decide/.test(s)) type = 'Decision';
  else if (/\b(finalize|establish|launch|set up a process)\b/.test(s)) type = 'Outcome';
  // a folder is suggested only when its own name appears in the text; never invented
  const folder = ws.folders.find(f => f.name.trim().length > 2 && s.includes(f.name.trim().toLowerCase()));
  // a related outcome only when it shares real words with the capture
  let outcomeId: string | null = null, top = .3;
  for (const o of ws.outcomes) { if (o.done_at) continue; const v = similarity(text, o.name); if (v >= top) { top = v; outcomeId = o.id; } }
  return { type, folderId: folder?.id ?? null, outcomeId, title: text.trim() };
}
export const proposalFingerprint = (p: Proposal): string => `${p.type}|${p.folderId ?? ''}|${p.outcomeId ?? ''}`;
export const rejectedBefore = (c: Capture, p: Proposal): boolean => c.rejected_fingerprints.includes(proposalFingerprint(p));

/** A likely duplicate is only ever proposed, and only among captures still waiting for review. */
export function duplicateOf(ws: Workspace, c: Capture): Capture | null {
  let best: Capture | null = null, top = .6;
  for (const o of pendingCaptures(ws)) { if (o.id === c.id) continue; const v = similarity(captureText(c), captureText(o)); if (v >= top) { best = o; top = v; } }
  return best;
}
/** A Task with no matching outcome needs a question (create one / pick one / leave it loose). Never create 'Unsorted work' silently. */
export const needsPlacement = (p: Proposal): boolean => p.type === 'Task' && !p.outcomeId;
