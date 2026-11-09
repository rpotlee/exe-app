import type { Assist, AssistItem } from './ai';

/** Local development only (`?local=1&fakeai=1`): canned help from simple keyword rules so the screen can be tried and tested with no key and no network.
 *  It is never used when signed in. */
export function makeFakeAi() {
  return {
    async settings() { return { provider: 'anthropic' as const, model: 'fake', key_last4: '0000', enabled: true, disclosure_accepted_at: '2027-01-01T00:00:00Z' }; },
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
