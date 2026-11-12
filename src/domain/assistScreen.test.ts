import { describe, expect, it } from 'vitest';
import { opportunityLabel } from './assistScreen';

describe('List opportunities', () => {
  it('offers a concrete action without provider work or generic task commentary', () => {
    expect(opportunityLabel('Email the venue about wheelchair access','todo')).toBe('Prepare draft');
    expect(opportunityLabel('Call the venue about wheelchair access','todo')).toBe('Prepare call');
    expect(opportunityLabel('Plan the launch checklist','todo')).toBe('Plan steps');
    expect(opportunityLabel('Take out the trash','todo')).toBeNull();
    expect(opportunityLabel('Remind me to email the venue','reminder')).toBeNull();
  });
});
