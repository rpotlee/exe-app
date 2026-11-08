import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Db } from '../../src/store/supabase';

/** Signed-out visitors see only this form. Sessions are kept by Supabase Auth; the database rules do the real protecting. */
export function AuthGate({ db, children }: { db: Db; children: (session: Session) => ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    db.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = db.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [db]);
  if (session === undefined) return <p className="auth-note" role="status">Loading…</p>;
  if (!session) return <SignIn db={db} />;
  return <>{children(session)}</>;
}

function SignIn({ db }: { db: Db }) {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget), email = String(f.get('email') ?? '').trim(), password = String(f.get('password') ?? '');
    setBusy(true); setMessage('');
    const { data, error } = mode === 'in' ? await db.auth.signInWithPassword({ email, password }) : await db.auth.signUp({ email, password });
    setBusy(false);
    if (error) setMessage(error.message);
    else if (mode === 'up' && !data.session) setMessage('Check your email to confirm your address, then sign in.');
  };
  return (
    <main className="auth-page">
      <form className="card auth-card" onSubmit={submit} aria-labelledby="auth-title">
        <h1 id="auth-title">{mode === 'in' ? 'Sign in to Exe' : 'Create your Exe account'}</h1>
        <p className="small-note">Your workspace is private to you. Nothing is shared.</p>
        <label className="form-field"><span className="small-note">Email</span><input className="text-input" name="email" type="email" autoComplete="email" required /></label>
        <label className="form-field"><span className="small-note">Password</span><input className="text-input" name="password" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} minLength={8} required /></label>
        {message && <p className="form-error" role="alert">{message}</p>}
        <div className="button-row"><button className="primary-button" type="submit" disabled={busy}>{mode === 'in' ? 'Sign in' : 'Create account'}</button>
          <button className="quiet-button" type="button" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMessage(''); }}>{mode === 'in' ? 'Create an account' : 'I have an account'}</button></div>
      </form>
    </main>
  );
}
