// Priority labels (revamp spec §6.4, owner direction DEC-016): the person's own label, or the AI's suggestion shown as such. The person's always wins,
// and labels can be turned off entirely.
import type { Capture } from './model';

export type Level = 'high' | 'medium' | 'low';
export type PriorityMode = 'ai' | 'mine' | 'off';
export interface AiHints { priorities: Record<string, { level: Level; why: string }>; groups: { name: string; ids: string[] }[] }


export function labelFor(c: Capture | undefined, hints: AiHints, mode: PriorityMode): { level: Level | null; fromAi: boolean; why: string } {
  if (!c || mode === 'off') return { level: null, fromAi: false, why: '' };
  if (c.user_priority === 'high' || c.user_priority === 'medium' || c.user_priority === 'low') return { level: c.user_priority, fromAi: false, why: 'You set this' };
  const h = mode === 'ai' ? hints.priorities[c.id] : undefined;
  return h ? { level: h.level, fromAi: true, why: h.why } : { level: null, fromAi: false, why: '' };
}
