// Stores or removes the signed-in user's own AI key. The key is encrypted here, on the server, and is never returned.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { isProvider, validKey, validModel } from '../_shared/ai.ts';
import { encryptKey } from '../_shared/crypto.ts';
import { b64ToHex, cors, json } from '../_shared/http.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const secret = Deno.env.get('EXE_KEY_SECRET');
  if (!secret) return json({ error: 'The server is not set up to store AI keys yet.' }, 503);
  const admin = createClient(Deno.env.get('SUPABASE_URL') as string, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.getUser((req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, ''));
  if (error || !data.user) return json({ error: 'Sign in first.' }, 401);
  const uid = data.user.id;
  let body: Record<string, unknown>; try { body = await req.json(); } catch { return json({ error: 'Bad request.' }, 400); }
  if (body.action === 'remove') { await admin.from('user_ai_settings').delete().eq('owner_id', uid); return json({ ok: true }); }
  if (body.action !== 'save') return json({ error: 'Unknown action.' }, 400);
  if (!isProvider(body.provider)) return json({ error: 'Choose Anthropic, OpenAI, Gemini or Groq.' }, 400);
  if (!validModel(body.model)) return json({ error: 'Enter the model name your provider gave you.' }, 400);
  if (!validKey(body.apiKey)) return json({ error: 'That does not look like an API key.' }, 400);
  const key = body.apiKey;
  const { error: e } = await admin.from('user_ai_settings').upsert({
    owner_id: uid, provider: body.provider, model: body.model, key_ciphertext: b64ToHex(await encryptKey(secret, key)), key_last4: key.slice(-4),
    enabled: false, disclosure_accepted_at: null,                    // a new key or provider needs a fresh disclosure
  }, { onConflict: 'owner_id' });
  if (e) return json({ error: 'Could not save the key.' }, 500);
  return json({ ok: true, provider: body.provider, model: body.model, last4: key.slice(-4) });
});
