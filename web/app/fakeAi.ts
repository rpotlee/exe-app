import type { Assist, AssistItem, GroupMatchSource, GroupMatchCandidate, GroupMatchResponse } from './ai';

/** Local development only (`?local=1&fakeai=1`): canned help from simple keyword rules so the screen can be tried and tested with no key and no network.
 *  It is never used when signed in. */
export function makeFakeAi() {
  return {
    /** Canned assistance-engine answers (local testing only; labeled by the UI as AI output, never as sent or researched). */
    async help(ids: string[], opts: { manual: boolean; want?: string; texts: Record<string, string> }) {
      const items = ids.map(id => {
        const t = (opts.texts[id] ?? '').toLowerCase();
        if (/email|text|message|write/.test(t)) return { captureId: id, kind: 'draft' as const, draft: { subject: 'Quick note', body: 'Hi [Name],\n\nI wanted to follow up on this. Could you let me know when works for you?\n\nThanks,\n[Your name]' } };
        if (/capital of australia/.test(t)) return { captureId: id, kind: 'quick_answer' as const, answer: { text: 'Canberra is the capital of Australia.', unsure: false } };
        if (t.includes('?')) return { captureId: id, kind: 'quick_answer' as const, answer: { text: 'I am not certain; please check a reliable source.', unsure: true } };
        if (opts.manual && opts.want === 'prep') return { captureId: id, kind: 'preparation' as const, prep: ['What is your availability?', 'What is the total price?', 'Are you insured?'] };
        if (opts.manual && opts.want === 'steps') return { captureId: id, kind: 'breakdown_offer' as const, steps: ['Decide what done looks like', 'List what you need', 'Do the first small part'] };
        if (opts.manual && opts.want === 'research') return { captureId: id, kind: 'research_offer' as const, queries: ['requirements ' + t.slice(0, 40)] };
        return { captureId: id, kind: 'none' as const };
      });
      return { items, usage: { input: 50 * ids.length, output: 20 * ids.length } };
    },
    async settings() { return { provider: 'anthropic' as const, model: 'fake', key_last4: '0000', enabled: true, disclosure_accepted_at: '2027-01-01T00:00:00Z' }; },
    async matchGroups(sources: GroupMatchSource[], outcomes: GroupMatchCandidate[]): Promise<GroupMatchResponse> {
      return { kind: 'group-match', matches: sources.map(source => {
        const words = source.text.toLowerCase().split(/[^a-z0-9]+/).filter(x => x.length > 3);
        const target = outcomes.find(o => o.name.toLowerCase().split(/[^a-z0-9]+/).some(w => w.length > 3 && words.includes(w)));
        return { kind: source.kind, id: source.id, outcomeId: target?.id ?? null, sourceRevision: source.revision, outcomeRevision: target?.revision ?? null, why: target ? 'Shared topic' : '' };
      }) };
    },
    async assist(ids: string[], texts: Record<string, string>): Promise<Assist & { provider: 'anthropic'; model: string }> {
      const items: AssistItem[] = [];
      for (const id of ids) {
        const t = texts[id] ?? '';
        if (/^email\b/i.test(t)) items.push({ captureId: id, kind: 'email', next: 'Send this today and ask for a reply by Friday', email: { to: (/email (\w+)/i.exec(t)?.[1] ?? ''), subject: 'Quick question', body: `Hi ${/email (\w+)/i.exec(t)?.[1] ?? '[name]'},\n\nI wanted to ask about this: ${t.replace(/^email\s+\w+\s*/i, '')}.\n\nThanks,\n[Your name]` } });
        else if (/register|incorporate|research/i.test(t)) items.push({ captureId: id, kind: 'research', next: 'Decide on an LLC or a sole proprietorship first', research: { topic: 'Register a business in New York', sources: [{ title: 'NY Department of State', domain: 'dos.ny.gov', query: 'form a business' }, { title: 'NYC Business Express', domain: 'nyc.gov', query: 'start a business' }] } });
        else if (/capital of australia/i.test(t)) items.push({ captureId: id, kind: 'question', answer: { text: 'The capital of Australia is Canberra.', sourceTitle: 'Britannica', sourceDomain: 'britannica.com' } });
      }
      const rach = ids.filter(i => /rachel|interview|position/i.test(texts[i] ?? ''));
      const priorities = ids.map(id => ({ captureId: id, level: (/passport|bill|dentist/i.test(texts[id] ?? '') ? 'high' : /desk|maybe/i.test(texts[id] ?? '') ? 'low' : 'medium') as 'high' | 'medium' | 'low', why: 'Fake AI' }));
      return { items, priorities, groups: rach.length >= 2 ? [{ name: 'Hiring', ids: rach, why: 'Both are about the open position.' }] : [], dependencies: rach.length >= 2 ? [{ before: rach[0] as string, after: rach[1] as string, why: 'Hear back before preparing.' }] : [], provider: 'anthropic', model: 'fake' };
    },
  };
}
