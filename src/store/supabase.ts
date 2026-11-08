import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../db/types';
import { emptyWorkspace, type Workspace } from '../domain/model';
import { uuid } from '../domain/uuid';
import type { Write } from '../domain/writes';
import { ConflictError, type Store } from './store';

export type Db = SupabaseClient<Database>;

/** The public URL and anon key only. The service-role key must never be in the browser. */
export function makeClient(url: string, anonKey: string): Db {
  if (/service_role/i.test(anonKey)) throw new Error('Refusing to start: that is the secret service-role key. Use the public anon key.');
  return createClient<Database>(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
}

export class SupabaseStore implements Store {
  readonly kind = 'supabase' as const;
  constructor(private readonly db: Db, readonly owner: string) {}
  async load(): Promise<Workspace> {
    const q = <T extends keyof Database['public']['Tables']>(t: T) => this.db.from(t).select('*');
    const [folders, outcomes, focus, tasks, captures, decisions, options, log, ideas, rels, settings] = await Promise.all([
      q('folders'), q('outcomes'), q('focus_assignments'), q('tasks'), q('captures'), q('decisions'), q('decision_options'), q('decision_log'), q('ideas'), q('relationships'), q('user_settings')]);
    for (const r of [folders, outcomes, focus, tasks, captures, decisions, options, log, ideas, rels, settings]) if (r.error) throw new Error(r.error.message);
    return {
      ...emptyWorkspace(), folders: folders.data ?? [], outcomes: outcomes.data ?? [], focus: focus.data ?? [], tasks: tasks.data ?? [], captures: captures.data ?? [],
      decisions: decisions.data ?? [], decisionOptions: options.data ?? [], decisionLog: log.data ?? [], ideas: ideas.data ?? [], relationships: rels.data ?? [], settings: settings.data?.[0] ?? null,
    };
  }
  async apply(writes: Write[]): Promise<void> { await this.applyOnce(uuid(), writes); }
  /** Applies the writes unless this key was already applied (a safe retry). Returns false when it was a repeat. */
  async applyOnce(key: string, writes: Write[]): Promise<boolean> {
    const { data, error } = await this.db.rpc('exe_apply_writes_once', { p_key: key, p_writes: writes as unknown as Json });
    if (!error) return data === true;
    if (error.code === '40001' || /conflict/i.test(error.message)) throw new ConflictError();
    throw new Error(error.message);
  }
}
