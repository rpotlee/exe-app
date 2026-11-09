// The AI activity log (owner direction, DEC-018): a plain-language record of what the AI did and how you answered it.
// Stored in the existing append-only audit table (actor 'ai' for what the AI prepared, 'user' for what you did with its suggestions).
// Event bodies hold only small facts (a kind, a count, ids), never generated text such as an email draft.
import type { AuditEvent, Workspace } from './model';

export interface AiEventInput { action: string; entityType?: string | null; entityId?: string | null; after?: Record<string, unknown> }
export const AI_ACTIONS = ['user-priority-ai', 'user-group-ai', 'ai-failed', 'ai-priorities', 'ai-help', 'ai-group', 'ai-depends'] as const;   // order only breaks ties between events logged in the same instant
export type Tone = 'high' | 'medium' | 'low' | 'fail' | 'name';
export type Part = string | { t: string; tone: Tone };
export interface Line { id: string; at: string; parts: Part[]; text: string; by: 'ai' | 'you' }

const snip = (s: string, n = 48): string => { const t = s.replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
const LEVEL: Record<string, string> = { high: 'High', medium: 'Medium', low: 'Low' };

const lv = (k: unknown): Part => (typeof k === 'string' && LEVEL[k] ? { t: LEVEL[k] as string, tone: k as Tone } : 'no');
const plain = (parts: Part[]): string => parts.map(p => (typeof p === 'string' ? p : p.t)).join('');

export function describe(ws: Workspace, e: AuditEvent): Line | null {
  const a = (e.after ?? {}) as Record<string, unknown>, b = (e.before ?? {}) as Record<string, unknown>;
  const cap = (id: unknown, n = 48): Part => { const c = typeof id === 'string' ? ws.captures.find(x => x.id === id) : undefined; return c ? { t: `“${snip(c.edited_text ?? c.text, n)}”`, tone: 'name' } : 'an item'; };
  const mk = (parts: Part[], by: 'ai' | 'you' = 'ai'): Line => ({ id: e.id, at: e.at, parts, text: plain(parts), by });
  const grp = (n: unknown): Part => ({ t: `“${snip(String(n ?? 'a group'), 40)}”`, tone: 'name' });
  switch (e.action) {
    case 'ai-help': return mk([a.kind === 'email' || a.kind === 'draft' ? 'Prepared a draft for ' : a.kind === 'research' || a.kind === 'research_offer' ? 'Suggested searches for ' : a.kind === 'preparation' ? 'Prepared questions for ' : a.kind === 'breakdown_offer' ? 'Suggested steps for ' : 'Answered the question in ', cap(e.entity_id)]);   // suggestions only: nothing was sent or researched
    case 'ai-priorities': {
      const parts: Part[] = [`Suggested priorities for ${a.total} ${Number(a.total) === 1 ? 'task' : 'tasks'}`], ks = (['high', 'medium', 'low'] as const).filter(k => Number(a[k]) > 0);
      if (ks.length) { parts.push(' ('); ks.forEach((k, i) => { if (i) parts.push(', '); parts.push(`${a[k]} `, lv(k)); }); parts.push(')'); }
      return mk(parts);
    }
    case 'ai-group': return mk([`Suggested grouping ${Array.isArray(a.ids) ? a.ids.length : 'some'} tasks as `, grp(a.name)]);
    case 'ai-depends': return mk(['Noticed ', cap(a.after, 30), ' may depend on ', cap(a.before, 30)]);
    case 'ai-failed': return mk([{ t: 'Couldn’t prepare help', tone: 'fail' }, a.message ? `: ${snip(String(a.message), 90)}` : '']);
    case 'user-group-ai': return mk([`Grouped ${a.n} tasks as `, grp(a.name), ' from the AI’s suggestion'], 'you');
    case 'user-priority-ai': { const parts: Part[] = ['Set ', cap(e.entity_id), ' to ', lv(a.level), ' priority']; if (b.ai) parts.push(' (the AI suggested ', lv(b.ai), ')'); return mk(parts, 'you'); }
    default: return null;
  }
}
/** Newest first. */
export function activity(ws: Workspace): Line[] {
  return ws.audit.filter(e => (AI_ACTIONS as readonly string[]).includes(e.action)).slice().sort((x, y) => y.at.localeCompare(x.at) || AI_ACTIONS.indexOf(x.action as typeof AI_ACTIONS[number]) - AI_ACTIONS.indexOf(y.action as typeof AI_ACTIONS[number]) || x.id.localeCompare(y.id))
    .map(e => describe(ws, e)).filter((l): l is Line => !!l);
}
