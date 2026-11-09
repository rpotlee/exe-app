import { useEffect, useMemo, useState } from 'react';
import { LocalStore } from '../../src/store/store';
import { QueuedStore } from '../../src/store/queued';
import { makeClient, SupabaseStore, type Db } from '../../src/store/supabase';
import { AuthGate } from '../auth/AuthGate';
import { makeAi } from './ai';
import { makeAssistantApi } from './assistantApi';
import { Shell } from './Shell';
import { makeFakeAi } from './fakeAi';

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
  const fake = useMemo(() => (new URLSearchParams(location.search).has('fakeai') ? makeFakeAi() : null), []);   // development only
  return <Shell store={store} where="This device only" fakeAi={fake} />;
}
function RemoteApp({ db, owner, email }: { db: Db; owner: string; email: string }) {
  const store = useMemo(() => new QueuedStore(new SupabaseStore(db, owner), localStorage), [db, owner]);
  const [out, setOut] = useState(false);
  useEffect(() => { if (out) void db.auth.signOut(); }, [out, db]);
  const ai = useMemo(() => makeAi(db, owner), [db, owner]);
  const assistantApi = useMemo(() => makeAssistantApi(db), [db]);
  return <Shell store={store} where={email} onSignOut={() => setOut(true)} ai={ai} assistantApi={assistantApi} />;
}
