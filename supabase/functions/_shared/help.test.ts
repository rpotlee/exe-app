// Server side of the assistance engine: strict parsing, no URLs or sources, bounded prompt size.
import { describe, expect, it } from 'vitest';
import { buildHelpPrompt, HELP_SYSTEM, MAX_HELP, parseHelp, usageSplit } from './ai.ts';
import { MAX_INPUT_BYTES } from './ai-runtime.ts';

describe('help parsing', () => {
  const ids = new Set(['a', 'b', 'c']);
  it('keeps only allowed ids and kinds, and answers every id (negatives cached too)', () => {
    const out = parseHelp(JSON.stringify({ items: [{ id: 'a', kind: 'draft', draft: { subject: 'Hi', body: 'Hello [Name]' } }, { id: 'zzz', kind: 'draft' }, { id: 'b', kind: 'delete_everything' }] }), ids);
    expect(out.map(i => [i.captureId, i.kind])).toEqual([['a', 'draft'], ['b', 'none'], ['c', 'none']]);
  });
  it('never carries URLs, sources or extra fields; research is queries only, and only when asked', () => {
    const out = parseHelp(JSON.stringify({ items: [
      { id: 'a', kind: 'quick_answer', answer: { text: 'See https://evil.example' } },
      { id: 'b', kind: 'research_offer', queries: ['llc rules ny', 'https://x.example'], sources: [{ url: 'https://x.example' }], completed: true },
    ] }), ids, true);
    expect(out[0]!.answer).toBeUndefined();
    expect(out[1]!.queries).toEqual(['llc rules ny']); expect(JSON.stringify(out)).not.toMatch(/sources|completed|https?:/);
    expect(parseHelp(JSON.stringify({ items: [{ id: 'b', kind: 'research_offer', queries: ['x'] }] }), ids)[0]!.queries).toBeUndefined();   // automatic: offer only
  });
  it('marks answers unsure unless the model says it is sure', () => {
    expect(parseHelp(JSON.stringify({ items: [{ id: 'a', kind: 'quick_answer', answer: { text: 'Canberra.' } }] }), ids)[0]!.answer).toEqual({ text: 'Canberra.', unsure: true });
  });
  it('a full batch of 8 long entries stays under the request size limit', () => {
    const items = Array.from({ length: 12 }, (_, i) => ({ id: `id-${i}-0000-0000-0000-000000000000`, text: 'x'.repeat(5000), kind: 'todo' }));
    const user = buildHelpPrompt(items); expect((user.match(/<entry /g) ?? []).length).toBe(MAX_HELP);
    expect(new TextEncoder().encode(HELP_SYSTEM + '\n' + user).length).toBeLessThan(MAX_INPUT_BYTES);
  });
  it('reports input and output tokens when the provider gives them', () => {
    expect(usageSplit({ usage: { prompt_tokens: 120, completion_tokens: 30 } })).toEqual({ input: 120, output: 30 });
    expect(usageSplit({ usage: { input_tokens: 5, output_tokens: 6 } })).toEqual({ input: 5, output: 6 });
    expect(usageSplit(null)).toEqual({ input: null, output: null });
  });
});
