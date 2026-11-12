// Viewing restores saved work. Only explicit prepare/send/choose/act may call the provider.
// The shared database admission lease covers generation through session persistence.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { buildRequest, extractText, type Provider } from '../_shared/ai.ts';
import { actionsFor, applyEnvelope, assistantFingerprint, authorizedGenerationAction, buildPrompt, emptyState, guard, MAX_TEXT, MAX_VERSIONS, parseEnvelope, REGISTRY, seenRequest, SYSTEM, type Envelope, type Op, type State } from '../_shared/assistant.ts';
import { AiRuntimeError, aiErrorResponse, withAiProvider } from '../_shared/ai-runtime.ts';
import { decryptKey } from '../_shared/crypto.ts';
import { cors, hexToB64, json } from '../_shared/http.ts';

const OPS: Op[] = ['open', 'restore', 'prepare', 'send', 'choose', 'act'];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const admin = createClient(Deno.env.get('SUPABASE_URL') as string, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.getUser((req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, ''));
  if (error || !data.user) return json({ error: 'Sign in first.' }, 401);
  const uid = data.user.id;
  let body: Record<string, unknown>; try { body = await req.json(); } catch { return json({ error: 'Bad request.' }, 400); }
  const op = body.op as Op, captureId = body.captureId, rid = body.clientRequestId;
  if (!OPS.includes(op) || typeof captureId !== 'string' || typeof rid !== 'string' || rid.length < 8 || rid.length > 80) return json({ error: 'Bad request.' }, 400);
  const [settings, capture, session] = await Promise.all([
    admin.from('user_ai_settings').select('provider, model, key_ciphertext, enabled, disclosure_accepted_at').eq('owner_id', uid).maybeSingle(),
    admin.from('captures').select('id, text, edited_text, kind, revision, archived_at').eq('owner_id', uid).eq('id', captureId).maybeSingle(),
    admin.from('assistant_sessions').select('id, state, revision, capture_revision').eq('owner_id', uid).eq('capture_id', captureId).maybeSingle(),
  ]);
  if (settings.error || capture.error || session.error) return json({ error: 'Could not restore the saved assistant. Your work is safe.' }, 503);
  const s = settings.data, cap = capture.data, row = session.data;
  if (!cap) return json({ error: 'That entry was not found.' }, 404);
  const { _inputFingerprint: savedFingerprint, ...stored } = ((row?.state ?? {}) as Partial<State> & { _inputFingerprint?: string });
  const state: State = { ...emptyState(), ...stored };
  const entry = cap.edited_text ?? cap.text;
  const fingerprint = s ? await assistantFingerprint({ entry, kind: cap.kind, provider: s.provider, model: s.model }) : '';
  const current = !!row && !!fingerprint && fingerprint === savedFingerprint;
  const restored = { state, stale: !!row && !current, prepared: current };
  // Old app versions also use `open`; this boundary guarantees they cannot spend tokens on view.
  if (op === 'open' || op === 'restore') return json(restored);
  if (seenRequest(state, rid) && current) return json({ ...restored, replay: true });
  if (op === 'prepare' && current) return json(restored);
  if (!s) return json({ error: 'Add your AI key in Settings first.' }, 400);
  if (!s.enabled || !s.disclosure_accepted_at) return json({ error: 'Turn on AI in Settings and accept the notice first.' }, 403);
  if (cap.archived_at) return json({ error: 'Restore this entry before asking for new help.' }, 409);
  const secret = Deno.env.get('EXE_KEY_SECRET');
  if (!secret) return json({ error: 'The server is not set up for AI yet.' }, 503);
  if ((op === 'choose' || op === 'act') && !current) return json({ error: 'This entry changed. Prepare new help before using its previous actions.', code: 'AI_STALE' }, 409);

  // A first typed request needs just one generation, not prepare followed by send.
  const context = current ? state : emptyState();
  let message: string | undefined, choice: string | undefined, intent: string | undefined;
  if (op === 'send') { message = typeof body.text === 'string' ? body.text.trim().slice(0, MAX_TEXT) : ''; if (!message) return json({ error: 'Write something first.' }, 400); }
  if (op === 'choose') { const c = context.question?.choices.find(x => x.id === body.choiceId); if (!c) return json({ error: 'That question is no longer open.' }, 409); choice = c.label; }
  if (op === 'act') { intent = authorizedGenerationAction(context, body.actionId) ?? undefined; if (!intent) return json({ error: 'That action is not available.' }, 409); }
  let apiKey: string;
  try { apiKey = await decryptKey(secret, hexToB64(String(s.key_ciphertext))); } catch { return json({ error: 'Your saved key could not be read. Save it again.' }, 500); }
  const prompt = buildPrompt({ entry, kind: cap.kind, op, message, choice, intent, artifact: context.artifact, question: context.question, turns: context.turns });
  const tokens = 1800, spec = buildRequest(s.provider as Provider, s.model, apiKey, SYSTEM, prompt, tokens);
  try {
    return await withAiProvider(admin, uid, spec, SYSTEM, prompt, tokens, async providerData => {
      const parsed = parseEnvelope(extractText(s.provider as Provider, providerData));
      if (!parsed) throw new AiRuntimeError('The assistant did not give a usable answer. Try again.', 502, 'AI_INVALID_RESPONSE');
      const env: Envelope = guard(parsed, { entry, message, choice });
      const next = applyEnvelope(context, env, { id: rid, userText: op === 'send' ? message : op === 'choose' ? choice : op === 'act' ? REGISTRY[intent as string]?.label : undefined });
      next.processed = [...new Set([...state.processed, ...next.processed])].slice(-30);
      if (!current) {
        next.versions = [...state.versions, ...(state.artifact ? [state.artifact] : []), ...next.versions].slice(-MAX_VERSIONS);
        if (next.artifact) next.artifact.revision = (state.artifact?.revision ?? 0) + 1;
      }
      next.actions = op === 'prepare' && !env.artifact && !env.question ? actionsFor(env, next.artifact, next.artifact?.type === 'message_draft') : next.actions;
      const fresh = await admin.from('captures').select('text, edited_text, kind, archived_at').eq('owner_id', uid).eq('id', captureId).maybeSingle();
      if (fresh.error || !fresh.data || fresh.data.archived_at || (fresh.data.edited_text ?? fresh.data.text) !== entry || fresh.data.kind !== cap.kind) throw new AiRuntimeError('This entry changed while help was being prepared. Open it again.', 409, 'AI_STALE');
      const savedState = { ...next, _inputFingerprint: fingerprint };
      const save = row
        ? await admin.from('assistant_sessions').update({ state: savedState, capture_revision: cap.revision }).eq('owner_id', uid).eq('id', row.id).eq('revision', row.revision).select('id').maybeSingle()
        : await admin.from('assistant_sessions').insert({ owner_id: uid, capture_id: captureId, capture_revision: cap.revision, state: savedState }).select('id').single();
      if (save.error || !save.data) throw new AiRuntimeError('Someone else changed this just now. Open it again.', 409, 'AI_STALE');
      if (env.artifact) await admin.from('audit_events').insert({ owner_id: uid, actor: 'ai', action: 'ai-help', entity_type: 'capture', entity_id: captureId, after: { kind: env.artifact.type === 'message_draft' ? 'email' : env.artifact.type === 'sources' ? 'research' : 'question' } });
      return json({ state: next, stale: false, prepared: true });
    }, fetch, async () => {
      // Recheck after admission: a concurrent request may have completed after our initial read.
      const latest = await admin.from('assistant_sessions').select('id, revision').eq('owner_id', uid).eq('capture_id', captureId).maybeSingle();
      if (latest.error || (latest.data?.revision ?? null) !== (row?.revision ?? null)) throw new AiRuntimeError('The saved assistant changed. Open it again to restore the latest help.', 409, 'AI_STALE');
    });
  } catch (e) { return aiErrorResponse(e); }
});
