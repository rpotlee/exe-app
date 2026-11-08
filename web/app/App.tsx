import { useEffect, useMemo, useState } from 'react';
import { LocalStore } from '../../src/store/store';
import { QueuedStore } from '../../src/store/queued';
import { makeClient, SupabaseStore, type Db } from '../../src/store/supabase';
import { AuthGate } from '../auth/AuthGate';
import { Shell } from './Shell';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined, anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const forceLocal = new URLSearchParams(location.search).has('local');

/** With a Supabase project configured, sign-in is required. Without one (or with ?local=1) the app runs on this device only. */
export function App() {
  const db = useMemo<Db | null>(() => (url && anon && !forceLocal ? makeClient(url, anon) : null), []);
  if (!db) return <LocalApp />;
  return <AuthGate db={db}>{session => <RemoteApp db={db} owner={session.user.id} email={session.user.email ?? ''} />}</AuthGate>;
}

function LocalApp() {
  const store = useMemo(() => new LocalStore('local', localStorage), []);
  return <Shell store={store} where="This device only" />;
}
function RemoteApp({ db, owner, email }: { db: Db; owner: string; email: string }) {
  const store = useMemo(() => new QueuedStore(new SupabaseStore(db, owner), localStorage), [db, owner]);
  const [out, setOut] = useState(false);
  useEffect(() => { if (out) void db.auth.signOut(); }, [out, db]);
  return <Shell store={store} where={email} onSignOut={() => setOut(true)} />;
}
