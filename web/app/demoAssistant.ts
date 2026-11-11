import { emptyState, type Artifact, type AssistAction, type AssistantState, type Question } from '../../src/domain/assistant';

/** DEMO ASSISTANT: a few keyword rules that exercise the assistant screens with no AI and no network. It is device-only, deterministic and always shown
 *  with a "Demo" tag. It is not an AI and must never be presented as one. The real assistant service (Phase 3) replaces it. */
const FACTS: [RegExp, string][] = [
  [/tallest mountain in south america/i, 'Aconcagua'], [/capital of australia/i, 'Canberra'], [/berlin wall/i, '1989'],
  [/ounces in a pound/i, '16 ounces'], [/speed of light/i, 'About 299,792 km per second'],
];
const act = (id: string, label: string, kind: AssistAction['kind'], priority: number, short?: string, disabled?: string): AssistAction => ({ id, intent: id, label, short, kind, priority, disabled });
const art = (type: Artifact['type'], title: string, body: string, extra: Partial<Artifact> = {}): Artifact => ({ id: `${type}-${Math.random().toString(36).slice(2, 8)}`, type, title, body, revision: 1, ...extra });
const nameOf = (t: string): string => (/(?:rachel|dan|sam|priya|marcus|elena)\b/i.exec(t)?.[0] ?? 'them').replace(/^./, c => c.toUpperCase());

const draftActions = (): AssistAction[] => [act('copy', 'Copy', 'safe_local', 1), act('shorter', 'Shorter', 'refine', 2), act('formal', 'More formal', 'refine', 3)];
function textDraft(name: string, topic: string): Artifact { return art('message_draft', 'Text draft', `Hi ${name}, quick question about ${topic}. Could you let me know when you have a moment? Thanks!`); }
function emailDraft(name: string, topic: string): Artifact { return art('message_draft', 'Email draft', `Hi ${name},\n\nI’m following up about ${topic}. Could you let me know where things stand, and whether you need anything from me?\n\nThanks,\n[Your name]`, { subject: `Quick question about ${topic}` }); }
const topicOf = (t: string): string => (/(?:about|regarding|re:?)\s+(.+)$/i.exec(t)?.[1] ?? 'this').replace(/[.?!]+$/, '');

/** What the assistant knows about an entry before anything is opened or answered: a real result, a real question, or nothing. */
export function evaluate(text: string): AssistantState {
  const s = emptyState(true), t = text.trim(), name = nameOf(t), topic = topicOf(t);
  const fact = FACTS.find(([re]) => re.test(t));
  if (fact) { s.artifact = art('answer', 'Answer', fact[1]); return s; }                                   // answer first; no forced buttons on a trivial answer
  const confirmation = /^email\b.+\bto confirm\s+(.+)$/i.exec(t);
  if (confirmation) {
    const detail = confirmation[1]!.replace(/[.?!]+$/, '');
    s.artifact = art('message_draft', 'Email draft', `Hello,\n\nCould you please confirm ${detail}? If there are details I should know before proceeding, please include them.\n\nThank you,\n[Your name]`, { subject: `Confirm ${detail}` });
    s.actions = draftActions(); return s;
  }
  if (/^(draft|write)\b.*\bemail\b/i.test(t) || /^email\b/i.test(t)) { s.artifact = emailDraft(name, topic); s.actions = draftActions(); return s; }
  if (/^text\b/i.test(t)) { s.artifact = textDraft(name, topic); s.actions = draftActions(); return s; }
  if (/\bcall\b/i.test(t)) { s.actions = [act('call_notes', 'Prepare call notes', 'ai_generate', 1, 'Call notes'), act('remind', 'Remind me', 'mutation', 2, 'Remind', 'Reminders arrive in a later update')]; return s; }   // the channel is already chosen: no email
  if (/dentist/i.test(t)) { s.question = { id: 'dentist', text: 'Book a visit or remind you about one?', choices: [{ id: 'book', label: 'Book a visit' }, { id: 'remind', label: 'Remind me' }] }; return s; }
  if (/\b(reach out|follow up|message|get in touch)\b/i.test(t)) { s.question = { id: 'channel', text: `How would you like to reach ${name}?`, choices: [{ id: 'text', label: 'Text' }, { id: 'email', label: 'Email' }, { id: 'remind', label: 'Reminder' }] }; return s; }
  if (/packing list|checklist/i.test(t)) { s.actions = [act('checklist', 'Build checklist', 'ai_generate', 1, 'Checklist')]; return s; }
  if (/file (my )?taxes/i.test(t)) { s.actions = [act('checklist', 'Build checklist', 'ai_generate', 1, 'Checklist'), act('options', 'Find filing options', 'ai_generate', 2, 'Options')]; return s; }
  return s;                                                                                                 // nothing worth saying: stay quiet (a valid outcome)
}

const shorten = (a: Artifact): Artifact => ({ ...a, body: a.subject ? a.body.replace(/\n\nI’m following up about/, '\n\nFollowing up on').replace(/ Could you let me know where things stand, and whether you need anything from me\?/, ' Any update?') : a.body.replace(/ Could you let me know when you have a moment\? Thanks!/, ' Any update? Thanks!'), revision: a.revision + 1 });
const formal = (a: Artifact): Artifact => ({ ...a, body: a.body.replace(/^Hi (\w+),?/, 'Dear $1,').replace(/Thanks!?$/, 'Thank you.'), revision: a.revision + 1 });
const withRevision = (s: AssistantState, next: Artifact, say: string): AssistantState => ({ ...s, versions: s.artifact ? [...s.versions, s.artifact] : s.versions, artifact: next, turns: [...s.turns, { id: `t${s.turns.length + 1}`, role: 'assistant', text: say }] });

export function choose(s: AssistantState, text: string, choice: string): AssistantState {
  const name = nameOf(text), topic = topicOf(text), turns = [...s.turns, { id: `t${s.turns.length + 1}`, role: 'user' as const, text: s.question?.choices.find(c => c.id === choice)?.label ?? choice }];
  if (s.question?.id === 'channel' && choice === 'text') return { ...s, question: null, turns, artifact: textDraft(name, topic), actions: draftActions() };
  if (s.question?.id === 'channel' && choice === 'email') return { ...s, question: null, turns, artifact: emailDraft(name, topic), actions: draftActions() };
  return { ...s, question: null, turns: [...turns, { id: `t${turns.length + 1}`, role: 'assistant', text: 'Reminders and booking arrive in a later update.' }], actions: [] };
}
export function doAction(s: AssistantState, text: string, id: string): AssistantState {
  const a = s.artifact;
  if (id === 'shorter' && a) return withRevision(s, shorten(a), 'Shortened.');
  if (id === 'formal' && a) return withRevision(s, formal(a), 'Made it more formal.');
  if (id === 'call_notes') return { ...s, artifact: art('call_notes', 'Call notes', `Topic: ${text.replace(/^call\s+/i, '')}\n• Describe the problem in one sentence\n• Ask for the earliest time they can come\n• Ask what it may cost\n\nNotes from the call:`), actions: [act('copy', 'Copy', 'safe_local', 1)], turns: [...s.turns, { id: `t${s.turns.length + 1}`, role: 'assistant', text: 'Prepared call notes. Nothing was called.' }] };
  if (id === 'checklist') { const items = (/taxes/i.test(text) ? ['Gather income forms', 'Gather deduction receipts', 'Choose how to file', 'Review before submitting'] : ['Clothes for each day', 'Toiletries', 'Chargers', 'Documents', 'Medication']).map(t => ({ text: t, done: false })); return { ...s, artifact: art('checklist', 'Checklist', '', { items }), actions: [act('copy', 'Copy', 'safe_local', 1)], turns: [...s.turns, { id: `t${s.turns.length + 1}`, role: 'assistant', text: 'Built an editable checklist.' }] }; }
  return s;
}
/** A typed follow-up: refine the active draft (never reset it), or say plainly what is not possible in the demo. */
export function send(s: AssistantState, text: string, typed: string): AssistantState {
  const turns = [...s.turns, { id: `t${s.turns.length + 1}`, role: 'user' as const, text: typed }], a = s.artifact, inv = /invoice\s*#?(\d+)/i.exec(typed);
  if (a && a.type === 'message_draft' && inv) return withRevision({ ...s, turns }, { ...a, body: a.body.replace(/(Thanks[^]*)$/, `Specifically, did you receive invoice ${inv[1]}?\n\n$1`).replace(/Could you let me know when you have a moment\? Thanks!$/, `Did you receive invoice ${inv[1]}? Thanks!`), revision: a.revision + 1 }, `Added a question about invoice ${inv[1]}.`);
  if (a && /short/i.test(typed)) return withRevision({ ...s, turns }, shorten(a), 'Shortened.');
  if (a && /formal|professional/i.test(typed)) return withRevision({ ...s, turns }, formal(a), 'Made it more formal.');
  void text; return { ...s, turns: [...turns, { id: `t${turns.length + 1}`, role: 'assistant', text: 'The demo assistant can shorten, formalize or add an invoice question. The real assistant answers anything.' }] };
}
export type { Question };
