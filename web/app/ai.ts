import type { Db } from '../../src/store/supabase';

export type Provider = 'anthropic' | 'openai' | 'gemini';
export const PROVIDER_NAMES: Record<Provider, string> = { anthropic: 'Anthropic', openai: 'OpenAI', gemini: 'Google Gemini' };
export interface AiSettings { provider: Provider; model: string; key_last4: string; enabled: boolean; disclosure_accepted_at: string | null }
export interface AiProposal { captureId: string; type: 'Task' | 'Outcome' | 'Decision' | 'Idea' | 'Note'; folderId: string | null; outcomeId: string | null; explanation: string; uncertainties: string[] }
export interface Suggestions { proposals: AiProposal[]; dropped: number; provider: Provider; model: string }
export interface AssistItem { captureId: string; kind: 'email' | 'research' | 'question'; next?: string; email?: { to: string; subject: string; body: string }; research?: { topic: string; sources: { title: string; domain: string; query: string }[] }; answer?: { text: string; sourceTitle: string; sourceDomain: string } }
export interface Assist { items: AssistItem[]; groups: { name: string; ids: string[]; why: string }[]; dependencies: { before: string; after: string; why: string }[] }
export type AiApi = ReturnType<typeof makeAi>;

const NOT_READY = 'AI is not set up on the server yet, so nothing was sent anywhere.';

/** Talks to the two server functions. The browser never sees the key after it is saved; it only sees the last 4 characters. */
export function makeAi(db: Db, uid: string) {
  async function call<T>(fn: string, body: unknown): Promise<T> {
    const { data, error } = await db.functions.invoke(fn, { body: body as Record<string, unknown> });
    if (!error) return data as T;
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') { try { const j = (await ctx.json()) as { error?: string }; if (j.error) throw new Error(j.error); } catch (e) { if (e instanceof Error && e.message !== 'Unexpected end of JSON input') throw e; } }
    throw new Error(NOT_READY);
  }
  return {
    async settings(): Promise<AiSettings | null> {
      const { data, error } = await db.from('user_ai_settings').select('provider, model, key_last4, enabled, disclosure_accepted_at').maybeSingle();
      if (error) throw new Error(error.message); return data as AiSettings | null;
    },
    saveKey: (provider: Provider, model: string, apiKey: string) => call<{ ok: boolean }>('ai-settings', { action: 'save', provider, model, apiKey }),
    removeKey: () => call<{ ok: boolean }>('ai-settings', { action: 'remove' }),
    /** The user has read the notice that capture text goes to their chosen provider. Only then can AI be turned on. */
    async accept(): Promise<void> { const { error } = await db.from('user_ai_settings').update({ enabled: true, disclosure_accepted_at: new Date().toISOString() }).eq('owner_id', uid); if (error) throw new Error(error.message); },
    async turnOff(): Promise<void> { const { error } = await db.from('user_ai_settings').update({ enabled: false }).eq('owner_id', uid); if (error) throw new Error(error.message); },
    test: () => call<{ ok: boolean }>('ai-review', { test: true }),
    suggest: (captureIds: string[]) => call<Suggestions>('ai-review', { captureIds }),
    assist: (captureIds: string[]) => call<Assist & { provider: Provider; model: string }>('ai-review', { mode: 'assist', captureIds }),
    suggestSteps: (outcomeId: string) => call<{ steps: string[]; provider: Provider; model: string }>('ai-review', { mode: 'steps', outcomeId }),
  };
}
