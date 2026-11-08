import { afterEach, describe, expect, it, vi } from 'vitest';
import { uuid } from './uuid';
const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
afterEach(() => vi.unstubAllGlobals());
describe('uuid', () => {
  it('makes valid, unique v4 ids', () => { const s = new Set(Array.from({ length: 2000 }, uuid)); expect(s.size).toBe(2000); for (const x of s) expect(x).toMatch(V4); });
  it('still works where crypto.randomUUID is missing (plain http on a network address)', () => {
    const real = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: (a: ArrayBufferView) => real.getRandomValues(a as Uint8Array<ArrayBuffer>) });
    const s = new Set(Array.from({ length: 500 }, uuid)); expect(s.size).toBe(500); for (const x of s) expect(x).toMatch(V4);
  });
  it('even works with no crypto at all', () => { vi.stubGlobal('crypto', undefined); expect(uuid()).toMatch(V4); });
});
