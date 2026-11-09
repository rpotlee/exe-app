import { describe, expect, it } from 'vitest';
import { aiReviewBatch } from './Review';
const pending = Array.from({ length: 30 }, (_, i) => ({ id: `capture-${i}` }));
describe('explicit classification selection', () => {
  it('limits an unselected backlog to the first four waiting captures', () => {
    expect(aiReviewBatch(pending, new Set()).map(c => c.id)).toEqual(['capture-0', 'capture-1', 'capture-2', 'capture-3']);
  });
  it('honors selected captures outside the default first four and caps the request at four', () => {
    const selected = new Set(['capture-20', 'capture-21', 'capture-22', 'capture-23', 'capture-24']);
    expect(aiReviewBatch(pending, selected).map(c => c.id)).toEqual(['capture-20', 'capture-21', 'capture-22', 'capture-23']);
  });
  it('only sends the available selected captures and ignores selections no longer pending', () => {
    expect(aiReviewBatch(pending, new Set(['capture-19', 'already-approved']))).toEqual([{ id: 'capture-19' }]);
    expect(aiReviewBatch([], new Set(['already-approved']))).toEqual([]);
  });
});
