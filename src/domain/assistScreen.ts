// Code-first screening for the AI assistance engine (Stage A). Plain rules that save provider calls; they are a cost filter,
// not the authority on what AI can help with: the person can always ask Exe about any entry by hand.

export type HelpKind = 'none' | 'draft' | 'quick_answer' | 'research_offer' | 'breakdown_offer' | 'preparation';
export const HELP_KINDS: readonly HelpKind[] = ['none', 'draft', 'quick_answer', 'research_offer', 'breakdown_offer', 'preparation'];
/** Bump when the prompt or result shape changes: every cached result made under an older version is ignored. */
export const HELP_SCHEMA = 1;

export type Screen = { verdict: 'skip' } | { verdict: 'offer'; kind: 'research_offer' | 'breakdown_offer' | 'preparation' } | { verdict: 'ai'; hint: HelpKind };

const norm = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();
const ROUTINE = /\b(take out|trash|garbage|recycling|laundry|dishes|vacuum|mop|tidy|water (the )?plants|walk (the )?dog|feed (the )?(cat|dog)|groceries|buy (milk|eggs|bread)|pick up|drop off|shower|workout|gym|stretch)\b/;
const DRAFT = /\b(email|e-mail|text|message|reply to|respond to|write (to|a|an)|draft|thank[- ]you note|follow up with|dm)\b/;
const QUESTION = /\?\s*$|^(what|who|when|where|why|which|how (much|many|long|do|does|is|to))\b/;   // "Do laundry" is a chore, not a question
const RESEARCH = /\b(research|look into|find out|compare|best (way|option)|options for|requirements for|how to register|investigate)\b/;
const CALL = /\b(call|phone|ring|interview|meeting with|meet with|negotiate)\b/;
const BIG = /\b(plan|organi[sz]e|prepare for|set up|launch|move house|move to|renovate|build|migrate|apply for)\b/;

/** A stable fingerprint of what the AI would see: normalized text, entry type and the schema version. Formatting-only edits don't change it. */
export function fingerprint(text: string, kind: string): string {
  const s = `${HELP_SCHEMA}|${kind}|${norm(text)}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return `${HELP_SCHEMA}:${(h >>> 0).toString(36)}:${s.length}`;
}

/** Decide, without AI, whether an entry is routine (skip), an obvious offer that needs no AI yet, or worth one batched AI look. */
export function screen(text: string, kind: string): Screen {
  const t = norm(text), words = t ? t.split(' ').length : 0;
  if (!t || words < 2 && !t.endsWith('?')) return { verdict: 'skip' };
  if (kind === 'reminder') return { verdict: 'skip' };                              // a reminder is a nudge, not a job for AI
  if (DRAFT.test(t)) return { verdict: 'ai', hint: 'draft' };
  if (QUESTION.test(t)) return { verdict: 'ai', hint: 'quick_answer' };
  if (kind === 'note') return { verdict: 'skip' };                                  // notes are kept, not worked on, unless asked
  if (RESEARCH.test(t)) return { verdict: 'offer', kind: 'research_offer' };         // offered only; research runs when asked
  if (CALL.test(t)) return { verdict: 'offer', kind: 'preparation' };                // call notes are generated on request
  if (BIG.test(t) && words >= 3) return { verdict: 'offer', kind: 'breakdown_offer' };
  if (ROUTINE.test(t) || words <= 3) return { verdict: 'skip' };
  return { verdict: 'ai', hint: 'none' };                                           // ambiguous: one cheap look in a batch
}

/** A quiet, deterministic invitation in List. It never generates or promises work was done. */
export function opportunityLabel(text: string, kind: string): string | null {
  const result = screen(text, kind);
  const hint = result.verdict === 'skip' ? 'none' : result.verdict === 'offer' ? result.kind : result.hint;
  return ({ draft: 'Prepare draft', quick_answer: 'Get answer', research_offer: 'Find where to look', breakdown_offer: 'Plan steps', preparation: 'Prepare call', none: null } as const)[hint];
}
