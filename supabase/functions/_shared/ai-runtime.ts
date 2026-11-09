// One admission path for every paid provider call. The database coordinates all Edge instances/devices.
// No provider response body, credentials, or prompt text is stored in admission state or errors.
import type { ReqSpec } from './ai.ts';
import { json } from './http.ts';

interface RpcClient { rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }> }
export class AiRuntimeError extends Error {
  constructor(message: string, readonly status: number, readonly code: string, readonly retryAfterSeconds = 0) { super(message); }
}
export const MAX_INPUT_BYTES = 8000;
export const reservationTokens = (system: string, user: string, outputTokens: number): number => Math.ceil(new TextEncoder().encode(system + '\n' + user).length / 2) + outputTokens;
const boundedSeconds = (n: number) => Math.min(86400, Math.max(1, Math.ceil(n)));
export function retrySeconds(value: string | null, fallback = 60, now = Date.now()): number {
  if (!value) return fallback;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return boundedSeconds(seconds);
  const stamp = Date.parse(value);
  return Number.isFinite(stamp) ? boundedSeconds((stamp - now) / 1000) : fallback;
}
export function resetSeconds(value: string | null): number {
  if (!value) return 60;
  if (/^\d+(\.\d+)?$/.test(value)) return boundedSeconds(Number(value));
  const parts = [...value.matchAll(/(\d+(?:\.\d+)?)(ms|h|m|s)/g)];
  if (!parts.length || parts.map(p => p[0]).join('') !== value) return 60;
  return boundedSeconds(parts.reduce((n, p) => n + Number(p[1]) * ({ h: 3600, m: 60, s: 1, ms: .001 }[p[2]!] ?? 0), 0));
}
const tokenHeader = (s: string | null): number | null => s !== null && /^\d+$/.test(s) ? Math.min(1_000_000, Number(s)) : null;
export function aiErrorResponse(error: unknown): Response {
  const e = error instanceof AiRuntimeError ? error : new AiRuntimeError('AI could not finish this request. Nothing was changed.', 502, 'AI_UNAVAILABLE');
  return json({ error: e.message, code: e.code, ...(e.retryAfterSeconds ? { retryAfterSeconds: e.retryAfterSeconds } : {}) }, e.status, e.retryAfterSeconds ? { 'Retry-After': String(e.retryAfterSeconds) } : {});
}
export function usageTokens(data: unknown): number | null {
  const j = data as { usage?: { total_tokens?: number; input_tokens?: number; output_tokens?: number }; usageMetadata?: { totalTokenCount?: number } } | null;
  const usage = j?.usage;
  const n = usage?.total_tokens ?? (typeof usage?.input_tokens === 'number' && typeof usage.output_tokens === 'number' ? usage.input_tokens + usage.output_tokens : j?.usageMetadata?.totalTokenCount);
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.ceil(n) : null;
}

/** Hold the lease through validation and session persistence, not merely through the HTTP request. */
export async function withAiProvider<T>(admin: RpcClient, owner: string, spec: ReqSpec, system: string, user: string, outputTokens: number, consume: (data: unknown) => Promise<T> | T, fetcher: typeof fetch = fetch, beforeFetch?: () => Promise<void>): Promise<T> {
  if (new TextEncoder().encode(system + '\n' + user).length > MAX_INPUT_BYTES) throw new AiRuntimeError('This request is too large. Select fewer entries or shorten the text.', 400, 'AI_INPUT_TOO_LARGE');
  const reserved = reservationTokens(system, user, outputTokens), lease = crypto.randomUUID();
  const claim = await admin.rpc('exe_ai_acquire', { p_owner: owner, p_lease: lease, p_tokens: reserved });
  if (claim.error || !claim.data || typeof claim.data !== 'object') throw new AiRuntimeError('AI request protection is not available yet. Your saved work is safe.', 503, 'AI_GATE_UNAVAILABLE');
  const gate = claim.data as { granted?: boolean; retryAfterSeconds?: number };
  if (!gate.granted) throw new AiRuntimeError('AI is paused briefly to stay within your provider limits. Try again after the countdown.', 429, 'AI_COOLDOWN', boundedSeconds(Number(gate.retryAfterSeconds) || 60));
  let used: number | null = 0, cooldown = 0, remaining: number | null = null, reset = 60;
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 25_000);
  try {
    if (beforeFetch) await beforeFetch();
    used = null;
    let response: Response;
    try { response = await fetcher(spec.url, { method: 'POST', headers: spec.headers, body: JSON.stringify(spec.body), signal: ctl.signal }); }
    catch { throw new AiRuntimeError('Could not reach your AI provider. Your saved work is safe.', 502, 'AI_PROVIDER_UNAVAILABLE'); }
    remaining = tokenHeader(response.headers.get('x-ratelimit-remaining-tokens'));
    reset = resetSeconds(response.headers.get('x-ratelimit-reset-tokens'));
    if (!response.ok) {
      if (response.status === 429) {
        cooldown = retrySeconds(response.headers.get('retry-after'), reset);
        throw new AiRuntimeError('Your provider has reached a rate or spending limit. AI is paused; your saved work is safe.', 429, 'AI_COOLDOWN', cooldown);
      }
      throw new AiRuntimeError(response.status === 401 || response.status === 403 ? 'Your provider rejected the key. Check it and save it again.' : response.status === 404 ? 'Your provider does not know that model name. Check it in Settings.' : 'Your AI provider could not complete this request.', 502, 'AI_PROVIDER_ERROR');
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new AiRuntimeError('Your provider did not return a usable answer.', 502, 'AI_INVALID_RESPONSE'); }
    used = usageTokens(data);
    return await consume(data);
  } finally {
    clearTimeout(timer);
    // Keep reservations on ambiguous failures/timeouts. The expiring, fenced lease remains safe if cleanup fails.
    try { await admin.rpc('exe_ai_release', { p_owner: owner, p_lease: lease, p_reserved: reserved, p_used: used, p_retry_seconds: cooldown, p_remaining_tokens: remaining, p_reset_seconds: reset }); } catch { /* expiry recovers after an unavailable database */ }
  }
}
