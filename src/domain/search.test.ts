import { describe, expect, it } from 'vitest';
import { emptyWorkspace, type Workspace } from './model';
import { score, search } from './search';

const base = { owner_id: 'u', created_at: '2027-01-01T00:00:00Z', updated_at: '', revision: 1 };
const ws: Workspace = { ...emptyWorkspace(),
  folders: [{ ...base, id: 'f1', name: 'Home', description: 'family things', icon: 'folder', position: 0 }],
  outcomes: [{ ...base, id: 'o1', folder_id: 'f1', name: 'Plan the pricing page', description: '', pinned: false, deadline: null, effort: null, done_at: null, last_worked_at: null, sources: [] }],
  tasks: [{ ...base, id: 't1', outcome_id: 'o1', name: 'Compare competitor pricing', notes: '', folder_id: null, done_at: null, archived_at: null, deadline: null, effort: null, position: 0, sources: [] }],
  captures: [
    { ...base, id: 'c1', kind: 'todo', display_title: null, user_priority: null, remind_at: null, remind_done_at: null, text: 'Pricing strategy idea', edited_text: null, source: 'Inbox', folder_id: null, batch_id: null, batch_text: null, completed_at: null, archived_at: null, status: 'pending', organized_as: null, review_state: null, review_at: null, rejected_fingerprints: [], task_id: null, merged_into: null },
    { ...base, id: 'c2', created_at: '2027-02-01T00:00:00Z', kind: 'todo', display_title: null, user_priority: null, remind_at: null, remind_done_at: null, text: 'Old note about prices', edited_text: null, source: 'Inbox', folder_id: null, batch_id: null, batch_text: null, completed_at: null, archived_at: '2027-03-01', status: 'pending', organized_as: null, review_state: null, review_at: null, rejected_fingerprints: [], task_id: null, merged_into: null },
  ] };

describe('search', () => {
  it('scores starts-with above word-start above substring, and needs every word', () => {
    expect(score('Pricing strategy', 'pricing')).toBe(3); expect(score('Plan the pricing page', 'pricing')).toBe(2); expect(score('Repricing', 'pricing')).toBe(1);
    expect(score('Plan the pricing page', 'plan costs')).toBe(0);
  });
  it('finds every kind, best match first, and labels archived items', () => {
    const hits = search(ws, 'pricing');
    expect(hits.map(h => h.kind)).toEqual(['Capture', 'Outcome', 'Step']);       // starts-with first, then word matches (newest first)
    expect(search(ws, 'prices')[0]).toMatchObject({ kind: 'Capture', archived: true });
    expect(search(ws, 'family')[0]).toMatchObject({ kind: 'Folder', id: 'f1' });
  });
  it('returns nothing for an empty query or no match, and never invents matches', () => {
    expect(search(ws, '  ')).toEqual([]); expect(search(ws, 'zzzz')).toEqual([]);
  });
});
