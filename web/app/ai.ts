import type { Db } from '../../src/store/supabase';
import { aiRequests, invokeAi, notifyAiSettingsChanged } from './aiRequests';
import type { HelpResponse, HelpWant } from './assistEngine';

export type Provider = 'anthropic' | 'openai' | 'gemini' | 'groq';
export const PROVIDER_NAMES: Record<Provider, string> = { anthropic: 'Anthropic', openai: 'OpenAI', gemini: 'Google Gemini', groq: 'Groq' };
export interface AiSettings { provider: Provider; model: string; analysis_model: string | null; key_last4: string; enabled: boolean; disclosure_accepted_at: string | null }
export interface AiProposal { captureId: string; type: 'Task' | 'Outcome' | 'Decision' | 'Idea' | 'Note'; folderId: string | null; outcomeId: string | null; explanation: string; uncertainties: string[] }
export interface Suggestions { proposals: AiProposal[]; dropped: number; provider: Provider; model: string }
export interface AssistItem { captureId: string; kind: 'email' | 'research' | 'question'; next?: string; email?: { to: string; subject: string; body: string }; research?: { topic: string; sources: { title: string; domain: string; query: string }[] }; answer?: { text: string; sourceTitle: string; sourceDomain: string } }
export interface PrioritySuggestion { captureId: string; level: 'high' | 'medium' | 'low'; why: string }
export interface Assist { items: AssistItem[]; priorities?: PrioritySuggestion[]; groups: { name: string; ids: string[]; why: string; updatedAt?: string }[]; dependencies: { before: string; after: string; why: string }[] }
export interface IntelligenceRecord { id: string; provider: string; model: string; source_revisions: Record<string, number>; result: Assist; dismissed_group_keys: string[]; created_at: string }
export interface AiUsageToday { requests: number; tokens: number; estimatedUsd: number; fallbackRateUsed: boolean; truncated: boolean }
export interface GroupMatchSource { kind: 'capture' | 'task'; id: string; text: string; revision: number }
export interface GroupMatchCandidate { id: string; name: string; revision: number }
export interface GroupMatchResponse { kind: 'group-match'; matches: { kind: 'capture' | 'task'; id: string; outcomeId: string | null; sourceRevision: number; outcomeRevision: number | null; why: string }[]; reused?: boolean }
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
      const { data, error } = await db.from('user_ai_settings').select('provider, model, analysis_model, key_last4, enabled, disclosure_accepted_at').maybeSingle();
      if (error) throw new Error(error.message); return data as AiSettings | null;
    },
    saveKey: (provider: Provider, model: string, apiKey: string) => call<{ ok: boolean }>('ai-settings', { action: 'save', provider, model, apiKey }).then(result => { notifyAiSettingsChanged(uid); return result; }),
    removeKey: () => call<{ ok: boolean }>('ai-settings', { action: 'remove' }).then(result => { notifyAiSettingsChanged(uid); return result; }),
    setAnalysisModel: (model: string | null) => call<{ ok: boolean }>('ai-settings', { action: 'analysis-model', model }).then(result => { notifyAiSettingsChanged(uid); return result; }),
    /** The user has read the notice that capture text goes to their chosen provider. Only then can AI be turned on. */
    async accept(): Promise<void> { const { error } = await db.from('user_ai_settings').update({ enabled: true, disclosure_accepted_at: new Date().toISOString() }).eq('owner_id', uid); if (error) throw new Error(error.message); notifyAiSettingsChanged(uid); },
    async turnOff(): Promise<void> { const { error } = await db.from('user_ai_settings').update({ enabled: false }).eq('owner_id', uid); if (error) throw new Error(error.message); notifyAiSettingsChanged(uid); },
    test: () => call<{ ok: boolean }>('ai-review', { test: true }),
    suggest: (captureIds: string[]) => call<Suggestions>('ai-review', { captureIds }),
    assist: (captureIds: string[]) => call<Assist & { provider: Provider; model: string }>('ai-review', { mode: 'assist', intent: 'analyze', captureIds }),
    matchGroups: (sources: GroupMatchSource[], outcomes: GroupMatchCandidate[]) => call<GroupMatchResponse>('ai-review', { mode: 'group-match', sources: sources.map(({ kind, id }) => ({ kind, id })), outcomeIds: outcomes.map(({ id }) => id) }),
    async savedIntelligence(): Promise<IntelligenceRecord[]> {
      const { data, error } = await db.from('ai_intelligence').select('id, provider, model, source_revisions, result, dismissed_group_keys, created_at, ai_group_proposals(name,why,capture_ids,ordinal), ai_dependency_proposals(before_capture_id,after_capture_id,why,ordinal)').order('created_at', { ascending: false }).limit(500);
      if (error) throw new Error('Could not restore saved AI suggestions.');
      // The typed proposal rows are the shared Groups graph. JSONB retains priorities
      // and old clients' analysis payload, but group/dependency display reads these rows.
      type SavedGraph = IntelligenceRecord & {
        ai_group_proposals: { name: string; why: string; capture_ids: string[]; ordinal: number }[];
        ai_dependency_proposals: { before_capture_id: string; after_capture_id: string; why: string; ordinal: number }[];
      };
      return ((data ?? []) as unknown as SavedGraph[]).filter(row => (row.result as unknown as { kind?: string }).kind !== 'group-match').reverse().map(row => ({
        ...row,
        result: {
          ...(row.result as unknown as Assist),
          groups: row.ai_group_proposals.slice().sort((a,b) => a.ordinal-b.ordinal).map(g => ({ name: g.name, ids: g.capture_ids, why: g.why })),
          dependencies: row.ai_dependency_proposals.slice().sort((a,b) => a.ordinal-b.ordinal).map(d => ({ before: d.before_capture_id, after: d.after_capture_id, why: d.why })),
        },
      })) as IntelligenceRecord[];
    },
    async usageToday(): Promise<AiUsageToday> {
      const day = new Date().toISOString().slice(0, 10);
      const { data, error } = await db.from('ai_usage').select('used_tokens,reserved_tokens,estimated_micro_usd,rate_source').gte('created_at', `${day}T00:00:00Z`).order('created_at', { ascending: false }).limit(5000);
      if (error) throw new Error('AI usage is unavailable.');
      const rows = data ?? [];
      return { requests: rows.length, tokens: rows.reduce((n,r) => n + (r.used_tokens ?? r.reserved_tokens), 0),
        estimatedUsd: rows.reduce((n,r) => n + Number(r.estimated_micro_usd ?? 0), 0) / 1_000_000,
        fallbackRateUsed: rows.some(r => r.rate_source === 'fallback'), truncated: rows.length === 5000 };
    },
    dismissGroup: (recordId: string, groupKey: string) => invokeAi<{ ok: boolean }>(db, 'ai-review', { mode: 'dismiss-group', recordId, groupKey }),
    /** Generate help only for an entry the person explicitly asked about. */
    help: (captureIds: string[], opts: { want?: HelpWant }) => call<HelpResponse>('ai-review', { mode: 'help', captureIds, manual: true, ...(opts.want ? { want: opts.want } : {}) }),
    suggestSteps: (outcomeId: string) => call<{ steps: string[]; provider: Provider; model: string }>('ai-review', { mode: 'steps', outcomeId }),
  };
}
