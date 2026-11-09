import { describe, expect, it, vi } from 'vitest';
import { AiRuntimeError, aiErrorResponse, MAX_INPUT_BYTES, reservationTokens, resetSeconds, retrySeconds, withAiProvider } from './ai-runtime.ts';
import { buildRequest } from './ai.ts';

const spec = buildRequest('groq', 'model', 'FAKE_TEST_KEY', 'system', 'question', 100);
const gate = () => ({ rpc: vi.fn(async (name: string, _args: Record<string, unknown>): Promise<{data: unknown; error: unknown}> => ({ data: name === 'exe_ai_acquire' ? { granted: true } : true, error: null })) });

describe('AI request admission', () => {
  it('fails closed when the migration or admission service is unavailable', async () => {
    const admin = gate(), fetcher = vi.fn();
    admin.rpc.mockResolvedValue({ data: null, error: { message: 'internal service details' } });
    await expect(withAiProvider(admin, 'owner', spec, 'system', 'question', 100, () => null, fetcher)).rejects.toMatchObject({ status: 503, code: 'AI_GATE_UNAVAILABLE' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('never starts a provider call while a lease or token budget is unavailable', async () => {
    const admin = gate(), fetcher = vi.fn();
    admin.rpc.mockResolvedValue({ data: { granted: false, retryAfterSeconds: 17 }, error: null });
    await expect(withAiProvider(admin, 'owner', spec, 'system', 'question', 100, () => null, fetcher)).rejects.toMatchObject({ status: 429, retryAfterSeconds: 17 });
    expect(fetcher).not.toHaveBeenCalled(); expect(admin.rpc).toHaveBeenCalledTimes(1);
  });
  it('keeps the lease through persistence and settles the actual token usage', async () => {
    const admin = gate(); let persisted = false;
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ usage: { total_tokens: 90 }, result: 'ok' }), { headers: { 'x-ratelimit-remaining-tokens': '400', 'x-ratelimit-reset-tokens': '1m2.5s' } }));
    const result = await withAiProvider(admin, 'owner', spec, 'system', 'question', 100, async () => { expect(admin.rpc).toHaveBeenCalledTimes(1); persisted = true; return 'saved'; }, fetcher);
    expect(persisted).toBe(true); expect(result).toBe('saved');
    expect(admin.rpc.mock.calls[1]?.[1]).toMatchObject({ p_used: 90, p_remaining_tokens: 400, p_reset_seconds: 63, p_retry_seconds: 0 });
    expect(admin.rpc.mock.calls[1]?.[1].p_lease).toBe(admin.rpc.mock.calls[0]?.[1].p_lease);
  });
  it('propagates a sanitized 429 and persists cooldown without exposing the upstream body', async () => {
    const admin = gate();
    const fetcher = vi.fn(async () => new Response('secret key echoed in provider error', { status: 429, headers: { 'Retry-After': '12', 'x-ratelimit-remaining-tokens': '0' } }));
    let failure: unknown;
    try { await withAiProvider(admin, 'owner', spec, 'system', 'question', 100, () => null, fetcher); } catch (e) { failure = e; }
    const response = aiErrorResponse(failure);
    expect(response.status).toBe(429); expect(response.headers.get('Retry-After')).toBe('12');
    expect(await response.text()).not.toMatch(/secret key|echoed/);
    expect(admin.rpc.mock.calls[1]?.[1]).toMatchObject({ p_retry_seconds: 12, p_remaining_tokens: 0 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('keeps reservations on ambiguous network failures but refunds a preflight conflict', async () => {
    const admin = gate(); const fetcher = vi.fn(async () => { throw new Error('network with sensitive details'); });
    await expect(withAiProvider(admin, 'owner', spec, 'system', 'question', 100, () => null, fetcher)).rejects.toMatchObject({ code: 'AI_PROVIDER_UNAVAILABLE' });
    expect(admin.rpc.mock.calls[1]?.[1].p_used).toBeNull();
    const other = gate(); fetcher.mockClear();
    await expect(withAiProvider(other, 'owner', spec, 'system', 'question', 100, () => null, fetcher, async () => { throw new AiRuntimeError('Changed',409,'AI_STALE'); })).rejects.toMatchObject({ status: 409 });
    expect(fetcher).not.toHaveBeenCalled(); expect(other.rpc.mock.calls[1]?.[1].p_used).toBe(0);
  });
  it('bounds prompt bytes before any admission or provider traffic', async () => {
    const admin = gate(), fetcher = vi.fn();
    await expect(withAiProvider(admin, 'owner', spec, 's', '漢'.repeat(MAX_INPUT_BYTES), 100, () => null, fetcher)).rejects.toMatchObject({ code: 'AI_INPUT_TOO_LARGE' });
    expect(admin.rpc).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
    expect(reservationTokens('abcd','efgh',100)).toBe(105);
  });
});
describe('provider reset headers', () => {
  it('understands numeric, HTTP-date and compound reset durations and bounds malformed values', () => {
    expect(retrySeconds('3')).toBe(3); expect(retrySeconds('0')).toBe(1);
    expect(retrySeconds(new Date(15_000).toUTCString(),60,0)).toBe(15);
    expect(retrySeconds('garbage')).toBe(60);
    expect(resetSeconds('2m59.56s')).toBe(180); expect(resetSeconds('7.66s')).toBe(8); expect(resetSeconds('500ms')).toBe(1);
    expect(resetSeconds('bad 1m')).toBe(60); expect(resetSeconds(null)).toBe(60);
  });
});
