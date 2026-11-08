// Read-only check that the Exe schema is on your Supabase project. Uses only the public URL and anon key from .env.
// Usage: node scripts/check-supabase.mjs
import { readFileSync, existsSync } from 'node:fs';
const env = {};
if (existsSync('.env')) for (const line of readFileSync('.env', 'utf8').split('\n')) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const url = (env.VITE_SUPABASE_URL || '').replace(/\/$/, ''), key = env.VITE_SUPABASE_ANON_KEY || '';
if (!url || !key) { console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env (copy .env.example to .env).'); process.exit(1); }
if (/service_role/i.test(key) || key.split('.')[1] && JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'service_role') { console.error('That is the SECRET service_role key. Use the public anon key instead, and never put the secret key in this app.'); process.exit(1); }
const tables = ['folders', 'outcomes', 'focus_assignments', 'tasks', 'captures', 'decisions', 'decision_options', 'decision_log', 'ideas', 'relationships', 'user_settings', 'ai_proposals', 'audit_events', 'idempotency_keys', 'user_ai_settings'];
let missing = 0;
for (const t of tables) {
  const r = await fetch(`${url}/rest/v1/${t}?select=*&limit=1`, { headers: { apikey: key } });
  const body = await r.text(); let code = ''; try { code = JSON.parse(body).code || ''; } catch {}
  // Signed out, the table must be unreachable: either permission denied (exists) or an empty list. "Not found" means the schema is missing.
  const exists = r.status !== 404 && code !== 'PGRST205' && code !== '42P01';
  const leaked = r.ok && body.trim() !== '[]';
  console.log(`${leaked ? 'LEAK ' : exists ? 'ok   ' : 'MISSING'} ${t}${leaked ? '  (rows readable while signed out!)' : ''}`);
  if (!exists || leaked) missing++;
}
console.log(missing ? `\n${missing} problem(s). Paste the migration into the Supabase SQL editor (see supabase/README.md).` : '\nAll 15 tables are present and closed to signed-out visitors.');
process.exit(missing ? 1 : 0);
