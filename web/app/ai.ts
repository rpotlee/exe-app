import type { Db } from '../../src/store/supabase';
import { aiRequests, invokeAi, notifyAiSettingsChanged } from './aiRequests';

export type Provider = 'anthropic' | 'openai' | 'gemini' | 'groq';
export const PROVIDER_NAMES: Record<Provider, string> = { anthropic: 'Anthropic', openai: 'OpenAI', gemini: 'Google Gemini', groq: 'Groq' };
export interface AiSettings { provider: Provider; model: string; key_last4: string; enabled: boolean; disclosure_accepted_at: string | null }
export interface AiProposal { captureId: string; type: 'Task' | 'Outcome' | 'Decision' | 'Idea' | 'Note'; folderId: string | null; outcomeId: string | null; explanation: string; uncertainties: string[] }
export interface Suggestions { proposals: AiProposal[]; dropped: number; provider: Provider; model: string }
export interface AssistItem { captureId: string; kind: 'email' | 'research' | 'question'; next?: string; email?: { to: string; subject: string; body: string }; research?: { topic: string; sources: { title: string; domain: string; query: string }[] }; answer?: { text: string; sourceTitle: string; sourceDomain: string } }
export interface PrioritySuggestion { captureId: string; level: 'high' | 'medium' | 'low'; why: string }
export interface Assist { items: AssistItem[]; priorities?: PrioritySuggestion[]; groups: { name: string; ids: string[]; why: string }[]; dependencies: { before: string; after: string; why: string }[] }
export type AiApi = ReturnType<typeof makeAi>;

/** Talks to the two server functions. The browser never sees the key after it is saved; it only sees the last 4 characters. */
export function makeAi(db: Db, uid: string) {
  const lane = aiRequests(db, uid);
  function call<T>(fn: string, body: Record<string, unknown>): Promise<T> {
    if (fn !== 'ai-review') return invokeAi<T>(db, fn, body);
    return lane.run(`${fn}:${JSON.stringify(body)}`, () => invokeAi<T>(db, fn, body));
  }
  return {
    async settings(): Promise<AiSettings | null> {
      const { data, error } = await db.from('user_ai_settings').select('provider, model, key_last4, enabled, disclosure_accepted_at').maybeSingle();
      if (error) throw new Error(error.message); return data as AiSettings | null;
    },
    saveKey: (provider: Provider, model: string, apiKey: string) => call<{ ok: boolean }>('ai-settings', { action: 'save', provider, model, apiKey }).then(result => { notifyAiSettingsChanged(uid); return result; }),
    removeKey: () => call<{ ok: boolean }>('ai-settings', { action: 'remove' }).then(result => { notifyAiSettingsChanged(uid); return result; }),
    /** The user has read the notice that capture text goes to their chosen provider. Only then can AI be turned on. */
    async accept(): Promise<void> { const { error } = await db.from('user_ai_settings').update({ enabled: true, disclosure_accepted_at: new Date().toISOString() }).eq('owner_id', uid); if (error) throw new Error(error.message); notifyAiSettingsChanged(uid); },
    async turnOff(): Promise<void> { const { error } = await db.from('user_ai_settings').update({ enabled: false }).eq('owner_id', uid); if (error) throw new Error(error.message); notifyAiSettingsChanged(uid); },
    test: () => call<{ ok: boolean }>('ai-review', { test: true }),
    suggest: (captureIds: string[]) => call<Suggestions>('ai-review', { captureIds }),
    assist: (captureIds: string[]) => call<Assist & { provider: Provider; model: string }>('ai-review', { mode: 'assist', intent: 'analyze', captureIds }),
    suggestSteps: (outcomeId: string) => call<{ steps: string[]; provider: Provider; model: string }>('ai-review', { mode: 'steps', outcomeId }),
  };
}
