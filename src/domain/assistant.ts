// The per-entry assistant model (assistant spec §3, §10). Phase 1 keeps it in memory/on this device; the shapes match what Phase 2 will persist.
// Separate facts, never one blob: the entry, the conversation, the prepared work (artifacts, versioned), the open question, and the actions on offer.
export type ArtifactType = 'message_draft' | 'call_notes' | 'answer' | 'checklist' | 'sources';
export interface Artifact { id: string; type: ArtifactType; title: string; body: string; subject?: string; items?: { text: string; done: boolean }[]; links?: { title: string; url: string; label: string }[]; revision: number }
export interface Choice { id: string; label: string }
export interface Question { id: string; text: string; choices: Choice[] }
export type ActionKind = 'safe_local' | 'ai_generate' | 'refine' | 'mutation';
export interface AssistAction { id: string; intent: string; label: string; short?: string; kind: ActionKind; priority: number; disabled?: string }
export interface Turn { id: string; role: 'user' | 'assistant'; text: string }
export interface AssistantState { demo: boolean; question: Question | null; artifact: Artifact | null; versions: Artifact[]; actions: AssistAction[]; turns: Turn[]; note?: string }

export const emptyState = (demo: boolean): AssistantState => ({ demo, question: null, artifact: null, versions: [], actions: [], turns: [] });

/** The one short line shown under a task (or nothing): only when there is a real result or a real question. */
export function statusLine(s: AssistantState | null): string | null {
  if (!s) return null;
  if (s.question) return 'Needs a detail';
  const a = s.artifact; if (!a) return null;
  if (a.type === 'answer') return `Answer: ${a.body.length > 34 ? a.body.slice(0, 33) + '…' : a.body}`;
  if (a.type === 'message_draft') return a.subject ? 'Email draft ready' : 'Text ready';
  if (a.type === 'call_notes') return 'Call notes ready';
  if (a.type === 'checklist') return 'Checklist ready';
  return 'Sources ready';
}
/** At most three actions in total (spec §6.1), best first. */
export const topActions = (s: AssistantState): AssistAction[] => s.actions.slice().sort((a, b) => a.priority - b.priority).slice(0, 3);
