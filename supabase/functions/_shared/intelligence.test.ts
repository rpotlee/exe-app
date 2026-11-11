import { describe, expect, it } from 'vitest';
import { intelligenceKey, sourceRevisions, sourcesCurrent } from './intelligence.ts';

describe('incremental intelligence identity', () => {
  const a = { id: 'a', revision: 2, text: 'Email venue' }, b = { id: 'b', revision: 4, text: 'Draft guide' };
  it('deduplicates reordered batches and changes identity on source or model changes', async () => {
    const first = await intelligenceKey('groq','chosen',[a,b]);
    expect(await intelligenceKey('groq','chosen',[b,a])).toBe(first);
    expect(await intelligenceKey('groq','chosen',[{...a,revision:3},b])).not.toBe(first);
    expect(await intelligenceKey('groq','other',[a,b])).not.toBe(first);
  });
  it('rejects missing and changed sources before a result can be saved', () => {
    const saved=sourceRevisions([a,b]);
    expect(sourcesCurrent(saved,[b,a])).toBe(true);
    expect(sourcesCurrent(saved,[a])).toBe(false);
    expect(sourcesCurrent(saved,[a,{...b,revision:5}])).toBe(false);
  });
});
