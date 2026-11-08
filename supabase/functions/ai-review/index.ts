// Asks the user's own AI provider for SUGGESTIONS about their pending captures. Nothing is written to the workspace:
// the result is validated against a strict schema and returned as proposals the person must approve.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { buildPrompt, buildRequest, buildStepsPrompt, extractText, MAX_CAPTURES, parseProposals, parseSteps, STEPS_SYSTEM, SYSTEM, type Provider } from '../_shared/ai.ts';
import { decryptKey } from '../_shared/crypto.ts';
import { cors, hexToB64, json } from '../_shared/http.ts';

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

  const { data: s } = await admin.from('user_ai_settings').select('provider, model, key_ciphertext, enabled, disclosure_accepted_at').eq('owner_id', uid).maybeSingle();
  if (!s) return json({ error: 'Add your AI key in Settings first.' }, 400);
  const test = body.test === true;
  if (!test && (!s.enabled || !s.disclosure_accepted_at)) return json({ error: 'Turn on AI in Settings and accept the notice first.' }, 403);
  let apiKey: string; try { apiKey = await decryptKey(secret, hexToB64(String(s.key_ciphertext))); } catch { return json({ error: 'Your saved key could not be read. Save it again.' }, 500); }

  const stepsMode = body.mode === 'steps';
  let existingSteps: string[] = [];
  let system = SYSTEM, user = '', allowed = { captureIds: new Set<string>(), folderIds: new Set<string>(), outcomeIds: new Set<string>() };
  if (test) { system = 'Reply with exactly this JSON and nothing else: {"ok":true}'; user = 'ping'; }
  else if (stepsMode) {
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

  const spec = buildRequest(s.provider as Provider, s.model, apiKey, system, user);
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 25_000);
  let res: Response;
  try { res = await fetch(spec.url, { method: 'POST', headers: spec.headers, body: JSON.stringify(spec.body), signal: ctl.signal }); }
  catch { return json({ error: 'Could not reach your AI provider (timeout or network). Nothing was changed.' }, 502); }
  finally { clearTimeout(timer); }
  if (!res.ok) {                          // never pass provider text through: it can echo parts of a key
    const why = res.status === 401 || res.status === 403 ? 'Your provider rejected the key. Check it and save it again.' : res.status === 404 ? 'Your provider does not know that model name. Check it in Settings.' : res.status === 429 ? 'Your provider says you hit a rate or spending limit.' : `Your provider returned an error (${res.status}).`;
    return json({ error: why, status: res.status }, 502);
  }
  const text = extractText(s.provider as Provider, await res.json().catch(() => null));
  if (test) return json({ ok: /"ok"\s*:\s*true/.test(text), provider: s.provider, model: s.model });
  if (stepsMode) return json({ steps: parseSteps(text, existingSteps), provider: s.provider, model: s.model });
  const { proposals, dropped } = parseProposals(text, allowed);
  return json({ proposals, dropped, provider: s.provider, model: s.model });
});
