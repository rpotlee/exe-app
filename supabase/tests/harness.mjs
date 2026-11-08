// Runs the real migrations in an in-process Postgres (PGlite) with the roles Supabase provides.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
export const A = '00000000-0000-4000-8000-00000000000a';
export const B = '00000000-0000-4000-8000-00000000000b';
export async function freshDb() {
  const db = new PGlite();
  await db.exec(`
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;`);
  for (const f of readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) await db.exec(readFileSync(join(dir, f), 'utf8'));
  return db;
}
/** Run fn as a signed-in user (RLS applies). */
export async function asUser(db, uid, fn) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false)`);
  try { return await fn(db); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false)`); }
}
/** Run fn as the server-side AI role acting for one owner. */
export async function asAi(db, uid, fn) {
  await db.exec(`set role exe_ai; select set_config('app.owner_id', '${uid}', false)`);
  try { return await fn(db); } finally { await db.exec(`reset role; select set_config('app.owner_id', '', false)`); }
}
/** The statement must fail; returns the error message. */
export async function fails(promise) {
  try { await promise; } catch (e) { return String(e.message || e); }
  throw new Error('expected the statement to fail, but it succeeded');
}
export const one = async (db, sql, p = []) => (await db.query(sql, p)).rows[0];
export const all = async (db, sql, p = []) => (await db.query(sql, p)).rows;
