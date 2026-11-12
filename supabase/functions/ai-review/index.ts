// Asks the user's own AI provider for SUGGESTIONS about their pending captures. Nothing is written to the workspace:
// the result is validated against a strict schema and returned as proposals the person must approve.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { buildHelpPrompt, HELP_MANUAL_SYSTEM, HELP_SYSTEM, HELP_TOKENS_AUTO, HELP_TOKENS_MANUAL, MAX_HELP, parseHelp, usageSplit, type HelpWant, ASSIST_SYSTEM, ASSIST_TOKENS, buildAssistPrompt, MAX_ASSIST, parseAssist, validAssistEnvelope, buildPrompt, buildRequest, buildStepsPrompt, extractText, MAX_CAPTURES, parseProposals, parseSteps, STEPS_SYSTEM, SYSTEM, type Provider, GROUP_MATCH_SYSTEM, GROUP_MATCH_TOKENS, buildGroupMatchPrompt, parseGroupMatches, validGroupMatchEnvelope } from '../_shared/ai.ts';
import { decryptKey } from '../_shared/crypto.ts';
import { cors, hexToB64, json } from '../_shared/http.ts';
import { AiRuntimeError, aiErrorResponse, withAiProvider } from '../_shared/ai-runtime.ts';
import { intelligenceKey, sourceRevisions, type Source } from '../_shared/intelligence.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const secret = Deno.env.get('EXE_KEY_SECRET');
  if (!secret) return json({ error: 'The server is not set up for AI yet.' }, 503);
  const admin = createClient(Deno.env.get('SUPABASE_URL') as string, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.getUser((req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, ''));
  if (error || !data.user) return json({ error: 'Sign in first.' }, 401);
  const uid = data.user.id;
  let body: Record<string, unknown>; try { body = await req.json(); } catch { return json({ error: 'Bad request.' }, 400); }
  if (body.mode === 'dismiss-group') {
    if (typeof body.recordId !== 'string' || typeof body.groupKey !== 'string' || body.groupKey.length > 500) return json({ error: 'Bad request.' }, 400);
    const record = await admin.from('ai_intelligence').select('id,result').eq('owner_id', uid).eq('id', body.recordId).maybeSingle();
    const groups = (record.data?.result as { groups?: { ids?: string[] }[] } | undefined)?.groups ?? [];
    if (!groups.some(g => Array.isArray(g.ids) && g.ids.slice().sort().join() === body.groupKey)) return json({ error: 'That suggestion was not found.' }, 404);
    const dismissed = await admin.rpc('exe_ai_dismiss_group', { p_owner: uid, p_id: body.recordId, p_key: body.groupKey });
    if (dismissed.error) return json({ error: 'Could not save your decision.' }, 503);
    return json({ ok: true });
  }
  // Deployed old clients used this mode on list load. Reject them without calling the provider.
  if (body.mode === 'assist' && body.intent !== 'analyze') return json({ error: 'Choose Analyze entries to ask AI for suggestions.', code: 'AI_EXPLICIT_ACTION_REQUIRED' }, 400);
  if (body.mode === 'help' && body.manual !== true) return json({ error: 'Choose Ask Exe to generate help for an entry.', code: 'AI_EXPLICIT_ACTION_REQUIRED' }, 400);

  const { data: s } = await admin.from('user_ai_settings').select('provider, model, analysis_model, key_ciphertext, enabled, disclosure_accepted_at').eq('owner_id', uid).maybeSingle();
  if (!s) return json({ error: 'Add your AI key in Settings first.' }, 400);
  const test = body.test === true;
  if (!test && (!s.enabled || !s.disclosure_accepted_at)) return json({ error: 'Turn on AI in Settings and accept the notice first.' }, 403);
  let apiKey: string; try { apiKey = await decryptKey(secret, hexToB64(String(s.key_ciphertext))); } catch { return json({ error: 'Your saved key could not be read. Save it again.' }, 500); }

  if (body.mode === 'group-match') {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const raw = body.sources;
    if (!Array.isArray(raw) || !raw.length || raw.length > 4 || !raw.every(x => x && typeof x === 'object' && (x.kind === 'capture' || x.kind === 'task') && typeof x.id === 'string' && uuid.test(x.id))) return json({ error: 'Choose up to four ungrouped tasks.' }, 400);
    const sources = raw as { kind: 'capture' | 'task'; id: string }[];
    if (new Set(sources.map(x => `${x.kind}:${x.id}`)).size !== sources.length) return json({ error: 'Duplicate tasks.' }, 400);
    const selected = body.outcomeIds;
    if (!Array.isArray(selected) || !selected.length || selected.length > 40 || !selected.every(x => typeof x === 'string' && uuid.test(x)) || new Set(selected).size !== selected.length) return json({ error: 'Choose existing groups to compare.' }, 400);
    const captureIds = sources.filter(x => x.kind === 'capture').map(x => x.id), taskIds = sources.filter(x => x.kind === 'task').map(x => x.id);
    const [caps, tasks, outcomes] = await Promise.all([
      captureIds.length ? admin.from('captures').select('id,text,edited_text,revision,kind,status,archived_at,completed_at').eq('owner_id', uid).in('id', captureIds) : Promise.resolve({ data: [], error: null }),
      taskIds.length ? admin.from('tasks').select('id,name,revision,outcome_id,group_manual,archived_at').eq('owner_id', uid).in('id', taskIds) : Promise.resolve({ data: [], error: null }),
      admin.from('outcomes').select('id,name,revision,done_at').eq('owner_id', uid).in('id', selected),
    ]);
    if (caps.error || tasks.error || outcomes.error) return json({ error: 'Could not read current tasks and groups.' }, 503);
    const capMap = new Map((caps.data ?? []).map(x => [x.id, x])), taskMap = new Map((tasks.data ?? []).map(x => [x.id, x]));
    if (sources.some(x => x.kind === 'capture' ? !capMap.get(x.id) || capMap.get(x.id)!.kind !== 'todo' || capMap.get(x.id)!.status !== 'pending' || !!capMap.get(x.id)!.archived_at : !taskMap.get(x.id) || !!taskMap.get(x.id)!.outcome_id || !!taskMap.get(x.id)!.group_manual || !!taskMap.get(x.id)!.archived_at)) return json({ error: 'An entry changed. Refresh Groups and try again.', code: 'AI_STALE' }, 409);
    const groups = (outcomes.data ?? []).filter(x => !x.done_at);
    if (groups.length !== selected.length) return json({ error: 'A group changed. Refresh Groups and try again.', code: 'AI_STALE' }, 409);
    const rows = sources.map(x => ({ id: `${x.kind}:${x.id}`, revision: (x.kind === 'capture' ? capMap.get(x.id)! : taskMap.get(x.id)!).revision as number, text: x.kind === 'capture' ? (capMap.get(x.id)!.edited_text ?? capMap.get(x.id)!.text) : taskMap.get(x.id)!.name }));
    const groupMap = new Map(groups.map(x => [x.id, x]));
    const model = s.analysis_model ?? s.model;
    const key = await intelligenceKey(`group-match:${s.provider}`, model, [...rows, ...groups.map(x => ({ id: `outcome:${x.id}`, revision: x.revision, text: x.name }))]);
    const cached = await admin.from('ai_intelligence').select('result').eq('owner_id', uid).eq('dedupe_key', key).maybeSingle();
    if (cached.error) return json({ error: 'Saved AI matches are unavailable.' }, 503);
    if (cached.data) return json({ ...(cached.data.result as Record<string, unknown>), reused: true });
    const prompt = buildGroupMatchPrompt(rows, groups), spec = buildRequest(s.provider as Provider, model, apiKey, GROUP_MATCH_SYSTEM, prompt, GROUP_MATCH_TOKENS);
    try {
      return await withAiProvider(admin, uid, spec, GROUP_MATCH_SYSTEM, prompt, GROUP_MATCH_TOKENS, async providerData => {
        const output = extractText(s.provider as Provider, providerData);
        if (!validGroupMatchEnvelope(output)) throw new AiRuntimeError('The provider did not return usable group matches.', 502, 'AI_INVALID_RESPONSE');
        const parsed = parseGroupMatches(output, new Set(rows.map(x => x.id)), new Set(groups.map(x => x.id)));
        const byId = new Map(parsed.map(x => [x.id, x]));
        const matches = sources.map((x, i) => { const suggestion = byId.get(rows[i]!.id), target = suggestion?.outcomeId ? groupMap.get(suggestion.outcomeId) : null; return { kind: x.kind, id: x.id, outcomeId: target?.id ?? null, sourceRevision: rows[i]!.revision, outcomeRevision: target?.revision ?? null, why: suggestion?.why ?? '' }; });
        const [freshCaps, freshTasks, freshOutcomes] = await Promise.all([
          captureIds.length ? admin.from('captures').select('id,revision,kind,status,archived_at').eq('owner_id', uid).in('id', captureIds) : Promise.resolve({ data: [], error: null }),
          taskIds.length ? admin.from('tasks').select('id,revision,outcome_id,group_manual,archived_at').eq('owner_id', uid).in('id', taskIds) : Promise.resolve({ data: [], error: null }),
          admin.from('outcomes').select('id,revision,done_at').eq('owner_id', uid).in('id', selected),
        ]);
        if (freshCaps.error || freshTasks.error || freshOutcomes.error) throw new AiRuntimeError('Could not verify current tasks and groups.', 503, 'AI_PERSISTENCE');
        const fc = new Map((freshCaps.data ?? []).map(x => [x.id, x])), ft = new Map((freshTasks.data ?? []).map(x => [x.id, x])), fo = new Map((freshOutcomes.data ?? []).map(x => [x.id, x]));
        if (sources.some((x, i) => x.kind === 'capture' ? fc.get(x.id)?.revision !== rows[i]!.revision || fc.get(x.id)?.kind !== 'todo' || fc.get(x.id)?.status !== 'pending' || !!fc.get(x.id)?.archived_at : ft.get(x.id)?.revision !== rows[i]!.revision || !!ft.get(x.id)?.outcome_id || !!ft.get(x.id)?.group_manual || !!ft.get(x.id)?.archived_at) || groups.some(x => fo.get(x.id)?.revision !== x.revision || !!fo.get(x.id)?.done_at)) throw new AiRuntimeError('Entries changed during matching. Try again for the current version.', 409, 'AI_STALE');
        const result = { kind: 'group-match', matches, groups: [], dependencies: [], priorities: [], items: [], provider: s.provider, model };
        const saved = await admin.from('ai_intelligence').insert({ owner_id: uid, dedupe_key: key, provider: s.provider, model, source_revisions: sourceRevisions(rows), result });
        if (saved.error && saved.error.code !== '23505') throw new AiRuntimeError('Could not save group matches.', 503, 'AI_PERSISTENCE');
        return json(result);
      }, fetch, undefined, 'interactive', model);
    } catch (e) { return aiErrorResponse(e); }
  }

  const stepsMode = body.mode === 'steps', assistMode = body.mode === 'assist', helpMode = body.mode === 'help';
  const manualHelp = helpMode && body.manual === true, want = (['draft', 'answer', 'prep', 'steps', 'research'] as const).find(w => w === body.want) as HelpWant | undefined;
  let helpIds = new Set<string>();
  let assistIds = new Set<string>();
  let assistRows: Source[] = [];
  let existingSteps: string[] = [];
  let system = SYSTEM, user = '', allowed = { captureIds: new Set<string>(), folderIds: new Set<string>(), outcomeIds: new Set<string>() };
  if (test) { system = 'Reply with exactly this JSON and nothing else: {"ok":true}'; user = 'ping'; }
  else if (helpMode) {
    // One entry the person asked about. Text is read from the database, never trusted from the client.
    const ids = (Array.isArray(body.captureIds) ? body.captureIds.filter((x): x is string => typeof x === 'string') : []).slice(0, manualHelp ? 1 : MAX_HELP);
    if (!ids.length) return json({ error: 'Nothing to look at.' }, 400);
    const caps = await admin.from('captures').select('id, text, edited_text, kind').eq('owner_id', uid).is('archived_at', null).in('id', ids);
    if (!caps.data?.length) return json({ error: 'Those entries were not found. They may still be saving; try again in a moment.' }, 400);
    helpIds = new Set(caps.data.map(c => c.id)); system = manualHelp ? HELP_MANUAL_SYSTEM : HELP_SYSTEM;
    user = buildHelpPrompt(caps.data.map(c => ({ id: c.id, text: c.edited_text ?? c.text, kind: c.kind ?? 'todo' })), manualHelp ? want : undefined);
  }
  else if (assistMode) {
    const ids = Array.isArray(body.captureIds) ? body.captureIds.filter((x): x is string => typeof x === 'string').slice(0, MAX_ASSIST) : [];
    if (!ids.length) return json({ error: 'Nothing to look at.' }, 400);
    const caps = await admin.from('captures').select('id, text, edited_text, revision').eq('owner_id', uid).eq('kind', 'todo').eq('status', 'pending').is('archived_at', null).is('completed_at', null).in('id', ids);
    if (!caps.data?.length) return json({ error: 'Those to-dos were not found.' }, 400);
    assistRows = caps.data.map(c => ({ id: c.id, revision: c.revision, text: c.edited_text ?? c.text }));
    assistIds = new Set(caps.data.map(c => c.id)); system = ASSIST_SYSTEM;
    user = buildAssistPrompt(caps.data.map(c => ({ id: c.id, text: c.edited_text ?? c.text })));
  } else if (stepsMode) {
    if (typeof body.outcomeId !== 'string') return json({ error: 'Choose an outcome.' }, 400);
    const [o, t] = await Promise.all([admin.from('outcomes').select('id, name, description').eq('owner_id', uid).eq('id', body.outcomeId).maybeSingle(), admin.from('tasks').select('name').eq('owner_id', uid).eq('outcome_id', body.outcomeId).is('archived_at', null)]);
    if (!o.data) return json({ error: 'That outcome was not found.' }, 400);
    existingSteps = (t.data ?? []).map(x => x.name as string); system = STEPS_SYSTEM;
    user = buildStepsPrompt({ title: o.data.name, description: o.data.description ?? '', existing: existingSteps });
  } else {
    const ids = Array.isArray(body.captureIds) ? body.captureIds.filter((x): x is string => typeof x === 'string').slice(0, MAX_CAPTURES) : [];
    if (!ids.length) return json({ error: 'Nothing to review.' }, 400);
    const [caps, folders, outcomes] = await Promise.all([
      admin.from('captures').select('id, text, edited_text').eq('owner_id', uid).eq('status', 'pending').is('review_state', null).in('id', ids),
      admin.from('folders').select('id, name').eq('owner_id', uid), admin.from('outcomes').select('id, name').eq('owner_id', uid).is('done_at', null)]);
    if (!caps.data?.length) return json({ error: 'Those captures are not waiting for review.' }, 400);
    allowed = { captureIds: new Set(caps.data.map(c => c.id)), folderIds: new Set((folders.data ?? []).map(f => f.id)), outcomeIds: new Set((outcomes.data ?? []).map(o => o.id)) };
    user = buildPrompt({ captures: caps.data.map(c => ({ id: c.id, text: c.edited_text ?? c.text })), folders: folders.data ?? [], outcomes: outcomes.data ?? [] });
  }

  const tokens = test ? 64 : helpMode ? (manualHelp ? HELP_TOKENS_MANUAL : HELP_TOKENS_AUTO) : assistMode ? ASSIST_TOKENS : stepsMode ? 600 : 1500;
  const chosenModel = assistMode ? (s.analysis_model ?? s.model) : s.model;
  const spec = buildRequest(s.provider as Provider, chosenModel, apiKey, system, user, tokens);
  if (assistMode) {
    // An explicit analysis is a durable, deduplicated job. No List load or edit enqueues one.
    const key = await intelligenceKey(s.provider, chosenModel, assistRows);
    const cached = await admin.from('ai_intelligence').select('result').eq('owner_id', uid).eq('dedupe_key', key).maybeSingle();
    if (cached.error) return json({ error: 'Saved AI suggestions are unavailable. Your List is safe.' }, 503);
    if (cached.data) return json({ ...(cached.data.result as Record<string, unknown>), provider: s.provider, model: chosenModel, reused: true });
    const queued = await admin.from('ai_jobs').upsert({ owner_id: uid, kind: 'organization', dedupe_key: key, capture_ids: assistRows.map(r => r.id) }, { onConflict: 'owner_id,dedupe_key', ignoreDuplicates: true });
    if (queued.error) return json({ error: 'Could not queue this analysis. Nothing was changed.' }, 503);
    const job = await admin.from('ai_jobs').select('id').eq('owner_id', uid).eq('dedupe_key', key).single();
    if (job.error || !job.data) return json({ error: 'Could not restore the queued analysis.' }, 503);
    const lease = crypto.randomUUID();
    const claim = await admin.rpc('exe_ai_claim_job', { p_owner: uid, p_job: job.data.id, p_lease: lease, p_interactive: true });
    if (claim.error) return json({ error: 'AI job protection is unavailable. Nothing was changed.' }, 503);
    if (!(claim.data as { claimed?: boolean })?.claimed) {
      const latest = await admin.from('ai_intelligence').select('result').eq('owner_id', uid).eq('dedupe_key', key).maybeSingle();
      if (latest.data) return json({ ...(latest.data.result as Record<string, unknown>), provider: s.provider, model: chosenModel, reused: true });
      return json({ error: 'This analysis is already in progress or cooling down. Try again shortly.', code: 'AI_JOB_BUSY' }, 409);
    }
    try {
      return await withAiProvider(admin, uid, spec, system, user, tokens, async providerData => {
        const providerText = extractText(s.provider as Provider, providerData);
        if (!validAssistEnvelope(providerText)) throw new AiRuntimeError('The provider did not return usable suggestions. Nothing was changed.', 502, 'AI_INVALID_RESPONSE');
        const parsed = parseAssist(providerText, assistIds);
        const result = { ...parsed, items: [] };
        const save = await admin.rpc('exe_ai_save_intelligence', { p_owner: uid, p_job: job.data.id, p_lease: lease, p_provider: s.provider, p_model: chosenModel, p_revisions: sourceRevisions(assistRows), p_result: result });
        if (save.error) throw new AiRuntimeError('Could not save the analysis. Nothing was changed.', 503, 'AI_PERSISTENCE');
        if (!save.data) throw new AiRuntimeError('These entries changed during analysis. Ask again for the current version.', 409, 'AI_STALE');
        return json({ ...result, provider: s.provider, model: chosenModel });
      }, fetch, undefined, 'interactive', chosenModel);
    } catch (e) {
      await admin.rpc('exe_ai_finish_job', { p_owner: uid, p_job: job.data.id, p_lease: lease, p_ok: false, p_error_code: e instanceof Error ? e.message.slice(0, 64) : 'AI_ERROR' });
      return aiErrorResponse(e);
    }
  }
  try {
    return await withAiProvider(admin, uid, spec, system, user, tokens, providerData => {
      const text = extractText(s.provider as Provider, providerData);
      if (test) return json({ ok: /"ok"\s*:\s*true/.test(text), provider: s.provider, model: s.model });
      if (helpMode) return json({ items: parseHelp(text, helpIds, manualHelp), usage: usageSplit(providerData), provider: s.provider, model: s.model });
      if (assistMode) return json({ ...parseAssist(text, assistIds), items: [], provider: s.provider, model: s.model });
      if (stepsMode) return json({ steps: parseSteps(text, existingSteps), provider: s.provider, model: s.model });
      const { proposals, dropped } = parseProposals(text, allowed);
      return json({ proposals, dropped, provider: s.provider, model: s.model });
    });
  } catch (e) { return aiErrorResponse(e); }
});
