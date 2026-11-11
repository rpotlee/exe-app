import { describe, expect, it } from 'vitest';
import type { Db } from '../../src/store/supabase';
import { makeAi } from './ai';

describe('saved Groups graph', () => {
  it('restores typed membership and dependencies instead of trusting the legacy JSON projection', async () => {
    const row = { id: 'analysis', provider: 'openai', model: 'chosen', source_revisions: { a: 1, b: 1 },
      result: { items: [], priorities: [], groups: [{ name: 'Old', ids: ['a','b'], why: '' }], dependencies: [] },
      dismissed_group_keys: [], created_at: '2026-11-10T00:00:00Z',
      ai_group_proposals: [{ name: 'My trip', why: 'Same trip', capture_ids: ['a','b'], ordinal: 1 }],
      ai_dependency_proposals: [{ before_capture_id: 'a', after_capture_id: 'b', why: 'Book first', ordinal: 1 }] };
    const query = { limit: async () => ({ data: [row], error: null }) };
    const db = { from: () => ({ select: () => ({ order: () => query }) }) } as unknown as Db;
    const saved = await makeAi(db, 'owner').savedIntelligence();
    expect(saved[0]?.result.groups).toEqual([{ name: 'My trip', ids: ['a','b'], why: 'Same trip' }]);
    expect(saved[0]?.result.dependencies).toEqual([{ before: 'a', after: 'b', why: 'Book first' }]);
  });
});
