// The AI activity log (owner direction, DEC-018): a plain-language record of what the AI did and how you answered it.
// Stored in the existing append-only audit table (actor 'ai' for what the AI prepared, 'user' for what you did with its suggestions).
// Event bodies hold only small facts (a kind, a count, ids), never generated text such as an email draft.
import type { AuditEvent, Workspace } from './model';

export interface AiEventInput { action: string; entityType?: string | null; entityId?: string | null; after?: Record<string, unknown> }
export const AI_ACTIONS = ['user-priority-ai', 'user-group-ai', 'ai-failed', 'ai-priorities', 'ai-help', 'ai-group', 'ai-depends'] as const;   // order only breaks ties between events logged in the same instant
export interface Line { id: string; at: string; icon: string; text: string; by: 'ai' | 'you' }

const snip = (s: string, n = 48): string => { const t = s.replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
const LEVEL: Record<string, string> = { high: 'High', medium: 'Medium', low: 'Low' };

export function describe(ws: Workspace, e: AuditEvent): Line | null {
  const a = (e.after ?? {}) as Record<string, unknown>, b = (e.before ?? {}) as Record<string, unknown>;
  const cap = (id: unknown, n = 48) => { const c = typeof id === 'string' ? ws.captures.find(x => x.id === id) : undefined; return c ? `“${snip(c.edited_text ?? c.text, n)}”` : 'an item'; };
  const mk = (icon: string, text: string, by: 'ai' | 'you' = 'ai'): Line => ({ id: e.id, at: e.at, icon, text, by });
  switch (e.action) {
    case 'ai-help': return mk('sparkles', a.kind === 'email' ? `Prepared an email draft for ${cap(e.entity_id)}` : a.kind === 'research' ? `Found where to look for ${cap(e.entity_id)}` : `Answered the question in ${cap(e.entity_id)}`);
    case 'ai-priorities': { const parts = (['high', 'medium', 'low'] as const).filter(k => Number(a[k]) > 0).map(k => `${a[k]} ${LEVEL[k]?.toLowerCase()}`); return mk('flag', `Suggested priorities for ${a.total} ${Number(a.total) === 1 ? 'to-do' : 'to-dos'}${parts.length ? ` (${parts.join(', ')})` : ''}`); }
    case 'ai-group': return mk('layers', `Suggested grouping ${Array.isArray(a.ids) ? a.ids.length : 'some'} to-dos as “${snip(String(a.name ?? 'a group'), 40)}”`);
    case 'ai-depends': return mk('link', `Noticed ${cap(a.after, 30)} may depend on ${cap(a.before, 30)}`);
    case 'ai-failed': return mk('alert-circle', `Couldn’t prepare help${a.message ? `: ${snip(String(a.message), 90)}` : ''}`);
    case 'user-group-ai': return mk('layers', `You grouped ${a.n} to-dos as “${snip(String(a.name ?? 'a group'), 40)}” from the AI’s suggestion`, 'you');
    case 'user-priority-ai': return mk('flag', `You set ${cap(e.entity_id)} to ${LEVEL[String(a.level)] ?? 'no'} priority${b.ai ? ` (the AI suggested ${LEVEL[String(b.ai)]})` : ''}`, 'you');
    default: return null;
  }
}
/** Newest first. */
export function activity(ws: Workspace): Line[] {
  return ws.audit.filter(e => (AI_ACTIONS as readonly string[]).includes(e.action)).slice().sort((x, y) => y.at.localeCompare(x.at) || AI_ACTIONS.indexOf(x.action as typeof AI_ACTIONS[number]) - AI_ACTIONS.indexOf(y.action as typeof AI_ACTIONS[number]) || x.id.localeCompare(y.id))
    .map(e => describe(ws, e)).filter((l): l is Line => !!l);
}
