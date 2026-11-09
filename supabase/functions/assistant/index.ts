// The per-entry assistant (assistant spec §10.3). One endpoint, four operations: open, send, choose, act. It reads the person's entry, builds a small
// bounded context, asks THEIR provider (their own key, only after they accepted the notice), validates the reply, and saves the session. It never writes
// the person's entries, never sends or books anything, and never trusts an action id the client invented.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { buildRequest, extractText, type Provider } from '../_shared/ai.ts';
import { actionsFor, applyEnvelope, buildPrompt, emptyState, guard, MAX_TEXT, parseEnvelope, REGISTRY, seenRequest, SYSTEM, type Envelope, type Op, type State } from '../_shared/assistant.ts';
import { decryptKey } from '../_shared/crypto.ts';
import { cors, hexToB64, json } from '../_shared/http.ts';

const OPS: Op[] = ['open', 'send', 'choose', 'act'];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const secret = Deno.env.get('EXE_KEY_SECRET'); if (!secret) return json({ error: 'The server is not set up for AI yet.' }, 503);
  const admin = createClient(Deno.env.get('SUPABASE_URL') as string, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.getUser((req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, ''));
  if (error || !data.user) return json({ error: 'Sign in first.' }, 401);
  const uid = data.user.id;
  let body: Record<string, unknown>; try { body = await req.json(); } catch { return json({ error: 'Bad request.' }, 400); }
  const op = body.op as Op, captureId = body.captureId, rid = body.clientRequestId;
  if (!OPS.includes(op) || typeof captureId !== 'string' || typeof rid !== 'string' || rid.length < 8 || rid.length > 80) return json({ error: 'Bad request.' }, 400);

  const [{ data: s }, { data: cap }, { data: row }] = await Promise.all([
    admin.from('user_ai_settings').select('provider, model, key_ciphertext, enabled, disclosure_accepted_at').eq('owner_id', uid).maybeSingle(),
    admin.from('captures').select('id, text, edited_text, kind, revision, archived_at').eq('owner_id', uid).eq('id', captureId).maybeSingle(),
    admin.from('assistant_sessions').select('id, state, revision, capture_revision').eq('owner_id', uid).eq('capture_id', captureId).maybeSingle(),
  ]);
  if (!cap) return json({ error: 'That entry was not found.' }, 404);
  if (!s) return json({ error: 'Add your AI key in Settings first.' }, 400);
  if (!s.enabled || !s.disclosure_accepted_at) return json({ error: 'Turn on AI in Settings and accept the notice first.' }, 403);
  const state: State = { ...emptyState(), ...((row?.state as Partial<State> | undefined) ?? {}) };
  if (seenRequest(state, rid)) return json({ state, stale: row ? row.capture_revision !== cap.revision : false, replay: true });           // a retry or double tap changes nothing
  if (op === 'open' && row && row.capture_revision === cap.revision) return json({ state, stale: false });                                  // already prepared for this version of the entry

  // validate the operation against the saved state, never against what the client claims
  const entry = cap.edited_text ?? cap.text; let message: string | undefined, choice: string | undefined, intent: string | undefined;
  if (op === 'send') { message = typeof body.text === 'string' ? body.text.trim().slice(0, MAX_TEXT) : ''; if (!message) return json({ error: 'Write something first.' }, 400); }
  if (op === 'choose') { const c = state.question?.choices.find(x => x.id === body.choiceId); if (!c) return json({ error: 'That question is no longer open.' }, 409); choice = c.label; }
  if (op === 'act') { const a = state.actions.find(x => x.id === body.actionId); if (!a || !REGISTRY[a.id] || a.id === 'copy') return json({ error: 'That action is not available.' }, 409); intent = a.id; }

  let apiKey: string; try { apiKey = await decryptKey(secret, hexToB64(String(s.key_ciphertext))); } catch { return json({ error: 'Your saved key could not be read. Save it again.' }, 500); }
  const prompt = buildPrompt({ entry, kind: cap.kind, op, message, choice, intent, artifact: state.artifact, question: state.question, turns: state.turns });
  const spec = buildRequest(s.provider as Provider, s.model, apiKey, SYSTEM, prompt, 1800);
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 25_000); let res: Response;
  try { res = await fetch(spec.url, { method: 'POST', headers: spec.headers, body: JSON.stringify(spec.body), signal: ctl.signal }); }
  catch { return json({ error: 'Could not reach your AI provider. Nothing was changed.' }, 502); } finally { clearTimeout(timer); }
  if (!res.ok) return json({ error: res.status === 401 || res.status === 403 ? 'Your provider rejected the key. Check it and save it again.' : res.status === 404 ? 'Your provider does not know that model name. Check it in Settings.' : res.status === 429 ? 'Your provider says you are over its limit. Try again later.' : 'Your AI provider had a problem. Try again.', status: res.status }, 502);   // never pass provider text through: it can echo a key
  const parsed = parseEnvelope(extractText(s.provider as Provider, await res.json().catch(() => null)));
  if (!parsed) return json({ error: 'The assistant did not give a usable answer. Try again.' }, 502);
  const env: Envelope = guard(parsed, { entry, message, choice });
  const next = applyEnvelope(state, env, { id: rid, userText: op === 'send' ? message : op === 'choose' ? choice : op === 'act' ? REGISTRY[intent as string]?.label : undefined });
  next.actions = op === 'open' && !env.artifact && !env.question ? actionsFor(env, next.artifact, next.artifact?.type === 'message_draft') : next.actions;

  const save = row
    ? await admin.from('assistant_sessions').update({ state: next, capture_revision: cap.revision }).eq('owner_id', uid).eq('id', row.id).eq('revision', row.revision)
    : await admin.from('assistant_sessions').insert({ owner_id: uid, capture_id: captureId, capture_revision: cap.revision, state: next });
  if (save.error) return json({ error: 'Someone else changed this just now. Try again.' }, 409);
  if (env.artifact) await admin.from('audit_events').insert({ owner_id: uid, actor: 'ai', action: 'ai-help', entity_type: 'capture', entity_id: captureId, after: { kind: env.artifact.type === 'message_draft' ? 'email' : env.artifact.type === 'sources' ? 'research' : 'question' } });
  return json({ state: next, stale: false });
});
