import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDb, asUser, asAi, fails, one, all, A, B } from './harness.mjs';

const mkOutcome = (db, name, extra = '') => one(db, `insert into outcomes (name${extra ? ',' + extra.split('=')[0] : ''}) values ($1${extra ? ',' + extra.split('=')[1] : ''}) returning id`, [name]).then(r => r.id);
const lane = (db, outcome, l) => db.query('insert into focus_assignments (outcome_id, lane) values ($1,$2)', [outcome, l]);

test('every table has an owner, timestamps and (where mutable) a revision', async () => {
  const db = await freshDb();
  const rows = await all(db, `select table_name, array_agg(column_name::text) cols from information_schema.columns where table_schema='public' and table_name in
    ('folders','outcomes','focus_assignments','tasks','captures','decisions','decision_options','decision_log','ideas','relationships','user_settings','ai_proposals','audit_events','idempotency_keys','user_ai_settings')
    group by table_name`);
  assert.equal(rows.length, 15);
  for (const r of rows) {
    assert.ok(r.cols.includes('owner_id'), `${r.table_name} owner_id`);
    assert.ok(r.cols.includes('created_at') || r.cols.includes('at'), `${r.table_name} timestamp`);
    if (!['decision_log', 'audit_events', 'idempotency_keys'].includes(r.table_name)) assert.ok(r.cols.includes('revision') && r.cols.includes('updated_at'), `${r.table_name} revision/updated_at`);
  }
});

test('row-level security: users see and change only their own rows', async () => {
  const db = await freshDb();
  await asUser(db, A, d => d.query(`insert into folders (name) values ('A home')`));
  await asUser(db, B, d => d.query(`insert into folders (name) values ('B home')`));
  assert.deepEqual((await asUser(db, A, d => all(d, 'select name from folders'))).map(r => r.name), ['A home']);
  assert.equal((await asUser(db, B, d => d.query(`update folders set name='hacked' where name='A home'`))).affectedRows, 0);
  assert.equal((await asUser(db, B, d => d.query(`delete from folders where name='A home'`))).affectedRows, 0);
  assert.match(await fails(asUser(db, B, d => d.query(`insert into folders (owner_id, name) values ('${A}', 'sneaky')`))), /row-level security/);
  assert.match(await fails(asUser(db, B, d => d.query('select * from nonexistent_table'))), /does not exist/);
});

test('an item cannot point at another user\'s row (owner-scoped foreign keys)', async () => {
  const db = await freshDb();
  const f = await asUser(db, A, d => one(d, `insert into folders (name) values ('A') returning id`));
  assert.match(await fails(asUser(db, B, d => d.query(`insert into outcomes (name, folder_id) values ('x', $1)`, [f.id]))), /foreign key|violates/);
});

test('Now cap: at most three, serialized, and done outcomes do not count', async () => {
  const db = await freshDb();
  await asUser(db, A, async d => {
    const ids = []; for (const n of ['o1', 'o2', 'o3', 'o4', 'o5']) ids.push(await mkOutcome(d, n));
    for (const id of ids.slice(0, 3)) await lane(d, id, 'now');
    assert.match(await fails(lane(d, ids[3], 'now')), /At most three/);
    await lane(d, ids[3], 'next');
    assert.match(await fails(d.query(`update focus_assignments set lane='now' where outcome_id=$1`, [ids[3]])), /At most three/);
    await d.query(`update focus_assignments set lane='done' where outcome_id=$1`, [ids[0]]);       // frees a slot
    await d.query(`update focus_assignments set lane='now' where outcome_id=$1`, [ids[3]]);
    assert.match(await fails(lane(d, ids[4], 'now')), /At most three/);
    await d.query(`delete from focus_assignments where outcome_id=$1`, [ids[1]]);                  // removing also frees one
    await lane(d, ids[4], 'now');
    assert.equal((await one(d, `select count(*)::int n from focus_assignments where lane='now'`)).n, 3);
  });
  // another user has their own three
  await asUser(db, B, async d => { for (const n of ['b1', 'b2', 'b3']) await lane(d, await mkOutcome(d, n), 'now'); });
});

test('one current focus, and it must be a Now outcome; leaving Now clears it', async () => {
  const db = await freshDb();
  await asUser(db, A, async d => {
    const o1 = await mkOutcome(d, 'o1'), o2 = await mkOutcome(d, 'o2');
    await lane(d, o1, 'now'); await lane(d, o2, 'next');
    await d.query(`insert into user_settings (workspace_name) values ('mine')`);
    assert.match(await fails(d.query('update user_settings set current_focus_outcome_id=$1', [o2])), /current focus must be one of the Now/);
    await d.query('update user_settings set current_focus_outcome_id=$1', [o1]);
    assert.equal((await one(d, 'select count(*)::int n from user_settings')).n, 1);              // a single row: a single focus by construction
    await d.query(`update focus_assignments set lane='next' where outcome_id=$1`, [o1]);
    assert.equal((await one(d, 'select current_focus_outcome_id f from user_settings')).f, null);
  });
});

test('relationships: no self-block, no cycles, valid ends, AI suggestions are never confirmed', async () => {
  const db = await freshDb();
  await asUser(db, A, async d => {
    const [a, b, c] = [await mkOutcome(d, 'a'), await mkOutcome(d, 'b'), await mkOutcome(d, 'c')];
    const rel = (f, t, kind = 'blocks', extra = '') => d.query(`insert into relationships (from_type,from_id,to_type,to_id,kind,confirmed${extra ? ',source' : ''}) values ('outcome',$1,'outcome',$2,$3,true${extra ? ",'ai'" : ''}) returning confirmed`, [f, t, kind]);
    assert.match(await fails(rel(a, a)), /itself/);
    await rel(a, b); await rel(b, c);
    assert.match(await fails(rel(c, a)), /dependency loop/);
    assert.match(await fails(rel(a, b)), /unique|duplicate/);
    await rel(c, a, 'informs');                                                                    // non-blocking links may circle
    assert.match(await fails(d.query(`insert into relationships (from_type,from_id,to_type,to_id,kind) values ('outcome',$1,'task',gen_random_uuid(),'related')`, [a])), /must exist/);
    const ai = await rel(c, b, 'related', 'ai'); assert.equal(ai.rows[0].confirmed, false);         // forced unconfirmed
    const t = await one(d, `insert into tasks (name, outcome_id) values ('t', $1) returning id`, [a]);
    assert.match(await fails(d.query(`insert into relationships (from_type,from_id,to_type,to_id,kind) values ('task',$1,'outcome',$2,'blocks')`, [t.id, a])), /already linked/);
  });
});

test('only confirmed blocks block, and a finished blocker stops blocking', async () => {
  const db = await freshDb();
  await asUser(db, A, async d => {
    const o = await mkOutcome(d, 'o');
    const t1 = (await one(d, `insert into tasks (name, outcome_id) values ('first', $1) returning id`, [o])).id;
    const t2 = (await one(d, `insert into tasks (name, outcome_id) values ('second', $1) returning id`, [o])).id;
    const r = (await one(d, `insert into relationships (from_type,from_id,to_type,to_id,kind,confirmed) values ('task',$1,'task',$2,'blocks',false) returning id`, [t1, t2])).id;
    assert.equal((await all(d, 'select * from v_blocked_items')).length, 0, 'a suggestion blocks nothing');
    await d.query('update relationships set confirmed=true where id=$1', [r]);
    assert.deepEqual((await all(d, 'select item_id from v_blocked_items')).map(x => x.item_id), [t2]);
    await d.query(`update tasks set done_at=now() where id=$1`, [t1]);
    assert.equal((await all(d, 'select * from v_blocked_items')).length, 0, 'finishing the blocker clears the block');
  });
});

test('the original capture text never changes; edits go to edited_text', async () => {
  const db = await freshDb();
  await asUser(db, A, async d => {
    const c = (await one(d, `insert into captures (text) values ('Register the business') returning id`)).id;
    assert.match(await fails(d.query(`update captures set text='changed' where id=$1`, [c])), /original capture text cannot be changed/);
    await d.query(`update captures set edited_text='Register the LLC', completed_at=now() where id=$1`, [c]);
    const row = await one(d, 'select text, edited_text, completed_at is not null done, status from captures where id=$1', [c]);
    assert.deepEqual(row, { text: 'Register the business', edited_text: 'Register the LLC', done: true, status: 'pending' });   // raw completion is its own thing
    assert.match(await fails(d.query(`insert into captures (text) values ('   ')`)), /check/);
  });
});

test('revision and updated_at advance on every change; a stale write matches nothing', async () => {
  const db = await freshDb();
  await asUser(db, A, async d => {
    const o = (await one(d, `insert into outcomes (name) values ('o') returning id, revision`));
    assert.equal(o.revision, 1);
    const first = await d.query(`update outcomes set name='o2' where id=$1 and revision=$2`, [o.id, 1]);
    const stale = await d.query(`update outcomes set name='o3' where id=$1 and revision=$2`, [o.id, 1]);
    assert.equal(first.affectedRows, 1); assert.equal(stale.affectedRows, 0);
    assert.equal((await one(d, 'select revision, name from outcomes where id=$1', [o.id])).revision, 2);
    await d.query(`update outcomes set owner_id='${B}' where id=$1`, [o.id]).catch(() => {});       // ownership cannot be moved
    assert.equal((await one(d, 'select owner_id from outcomes where id=$1', [o.id])).owner_id, A);
  });
});

test('decisions: resolved needs a date; options are unique per decision; the log is append-only', async () => {
  const db = await freshDb();
  await asUser(db, A, async d => {
    const dec = (await one(d, `insert into decisions (name) values ('Which CRM?') returning id`)).id;
    assert.match(await fails(d.query(`update decisions set status='resolved' where id=$1`, [dec])), /check/);
    await d.query(`update decisions set status='resolved', resolved_at=now(), chosen_option='HubSpot' where id=$1`, [dec]);
    await d.query(`insert into decision_options (decision_id, text) values ($1,'HubSpot')`, [dec]);
    assert.match(await fails(d.query(`insert into decision_options (decision_id, text) values ($1,' hubspot ')`, [dec])), /unique|duplicate/);
    await d.query(`insert into decision_log (decision_id, type, text) values ($1,'created','')`, [dec]);
    assert.match(await fails(d.query(`update decision_log set text='rewritten'`)), /permission|append-only/);
    assert.match(await fails(d.query(`delete from decision_log`)), /permission/);
  });
});

test('the audit history is append-only, even for the owner', async () => {
  const db = await freshDb();
  await asUser(db, A, async d => {
    await d.query(`insert into audit_events (actor, action) values ('user', 'priority-apply')`);
    assert.match(await fails(d.query(`update audit_events set action='x'`)), /permission/);
    assert.match(await fails(d.query(`delete from audit_events`)), /permission/);
  });
  assert.match(await fails(db.query(`update audit_events set action='x'`)), /append-only/);        // even a superuser hits the trigger
});

test('AI can never delete or complete anything: it can read and add proposals, nothing else', async () => {
  const db = await freshDb();
  const ids = await asUser(db, A, async d => {
    const o = await mkOutcome(d, 'o'); const t = (await one(d, `insert into tasks (name, outcome_id) values ('t', $1) returning id`, [o])).id;
    const c = (await one(d, `insert into captures (text) values ('Find a plumber') returning id`)).id;
    await d.query(`insert into user_ai_settings (provider, model, key_ciphertext, key_last4) values ('anthropic','m',''::bytea,'abcd')`).catch(() => {});
    return { o, t, c };
  });
  await asAi(db, A, async d => {
    assert.equal((await all(d, 'select id from tasks')).length, 1, 'AI reads the owner\'s context');
    await d.query(`insert into ai_proposals (owner_id, capture_id, source_version, fingerprint, suggested_type, explanation, provider, model) values ($1,$2,1,'fp1','Task','looks like a task','anthropic','m')`, [A, ids.c]);
    assert.match(await fails(d.query(`update tasks set done_at=now()`)), /permission denied/);
    assert.match(await fails(d.query(`delete from tasks`)), /permission denied/);
    assert.match(await fails(d.query(`delete from captures`)), /permission denied/);
    assert.match(await fails(d.query(`update captures set completed_at=now()`)), /permission denied/);
    assert.match(await fails(d.query(`update decisions set status='resolved'`)), /permission denied/);
    assert.match(await fails(d.query(`insert into tasks (owner_id, name) values ($1,'sneaky')`, [A])), /permission denied/);
    assert.match(await fails(d.query(`insert into focus_assignments (owner_id, outcome_id, lane) values ($1,$2,'now')`, [A, ids.o])), /permission denied/);
    assert.match(await fails(d.query(`update ai_proposals set status='approved'`)), /permission denied/);
    assert.match(await fails(d.query(`delete from ai_proposals`)), /permission denied/);
    assert.match(await fails(d.query(`insert into ai_proposals (owner_id, capture_id, source_version, fingerprint, status) values ($1,$2,1,'fp2','approved')`, [A, ids.c])), /row-level security/);
    assert.match(await fails(d.query(`select * from user_ai_settings`)), /permission denied/);
    assert.match(await fails(d.query(`select * from audit_events`)), /permission denied/);
  });
  // the same suggestion for the same capture version is not stored twice
  await asAi(db, A, async d => assert.match(await fails(d.query(`insert into ai_proposals (owner_id, capture_id, source_version, fingerprint) values ($1,$2,1,'fp1')`, [A, ids.c])), /unique|duplicate/));
  // AI acting for A sees nothing of B
  await asUser(db, B, d => d.query(`insert into folders (name) values ('B only')`));
  await asAi(db, A, async d => assert.equal((await all(d, 'select * from folders')).length, 0));
  // an AI-acting session cannot confirm a suggested relationship
  await asUser(db, A, async d => {
    const [x, y] = [await mkOutcome(d, 'x'), await mkOutcome(d, 'y')];
    await d.query(`insert into relationships (from_type,from_id,to_type,to_id,kind,source) values ('outcome',$1,'outcome',$2,'blocks','ai')`, [x, y]);
    await d.exec(`select set_config('app.actor','ai',false)`);
    assert.match(await fails(d.query(`update relationships set confirmed=true`)), /Only you can confirm/);
    await d.exec(`select set_config('app.actor','',false)`);
    await d.query(`update relationships set confirmed=true`);
  });
});

test('the AI key never reaches the browser role', async () => {
  const db = await freshDb();
  await db.query(`insert into user_ai_settings (owner_id, provider, model, key_ciphertext, key_last4) values ($1,'openai','my-model','\\x00ff'::bytea,'9z9z')`, [A]);
  await asUser(db, A, async d => {
    assert.match(await fails(d.query('select key_ciphertext from user_ai_settings')), /permission denied/);
    assert.match(await fails(d.query('select * from user_ai_settings')), /permission denied/);
    const row = await one(d, 'select provider, model, key_last4, enabled from user_ai_settings');
    assert.deepEqual(row, { provider: 'openai', model: 'my-model', key_last4: '9z9z', enabled: false });
    assert.match(await fails(d.query(`update user_ai_settings set key_ciphertext='\\x01'::bytea`)), /permission denied/);
    assert.match(await fails(d.query(`update user_ai_settings set provider='gemini'`)), /permission denied/);
    assert.match(await fails(d.query(`update user_ai_settings set enabled=true`)), /check/);       // needs the disclosure first
    await d.query(`update user_ai_settings set enabled=true, disclosure_accepted_at=now(), model='another'`);
  });
  await asUser(db, B, async d => assert.equal((await all(d, 'select provider from user_ai_settings')).length, 0));
  assert.match(await fails(db.query(`insert into user_ai_settings (owner_id, provider, model, key_ciphertext, key_last4) values ($1,'someone-else','m','\\x00'::bytea,'')`, [B])), /check/);   // only the three providers
});

test('idempotency keys: a retry of the same key cannot create a second row', async () => {
  const db = await freshDb();
  await asUser(db, A, async d => {
    await d.query(`insert into idempotency_keys (key, request_hash) values ('capture-abc12345','h1')`);
    assert.match(await fails(d.query(`insert into idempotency_keys (key, request_hash) values ('capture-abc12345','h1')`)), /unique|duplicate/);
    assert.match(await fails(d.query(`insert into idempotency_keys (key, request_hash) values ('x','h')`)), /check/);
  });
  await asUser(db, B, d => d.query(`insert into idempotency_keys (key, request_hash) values ('capture-abc12345','h1')`));  // keys are per user
});

test('deleting a folder or outcome never deletes the work inside it', async () => {
  const db = await freshDb();
  await asUser(db, A, async d => {
    const f = (await one(d, `insert into folders (name) values ('Home') returning id`)).id;
    const o = (await one(d, `insert into outcomes (name, folder_id) values ('o', $1) returning id`, [f])).id;
    const t = (await one(d, `insert into tasks (name, outcome_id) values ('t', $1) returning id`, [o])).id;
    const c = (await one(d, `insert into captures (text, folder_id, task_id) values ('c', $1, $2) returning id`, [f, t])).id;
    await d.query('delete from folders where id=$1', [f]);
    assert.equal((await one(d, 'select folder_id from outcomes where id=$1', [o])).folder_id, null);
    assert.equal((await one(d, 'select folder_id from captures where id=$1', [c])).folder_id, null);
    await d.query('delete from outcomes where id=$1', [o]);
    assert.equal((await one(d, 'select outcome_id from tasks where id=$1', [t])).outcome_id, null, 'the step stays, loose');
    assert.equal((await one(d, 'select count(*)::int n from captures')).n, 1);
  });
});

test('exe_apply_writes: all-or-nothing, rejects stale writes, unknown tables and bad columns', async () => {
  const db = await freshDb();
  const call = (d, writes) => d.query('select exe_apply_writes($1::jsonb)', [JSON.stringify(writes)]);
  const folder = (id, name) => ({ table: 'folders', op: 'insert', row: { id, owner_id: A, name, description: '', icon: 'folder', position: 0, created_at: '2027-01-01T00:00:00Z', updated_at: '2027-01-01T00:00:00Z', revision: 1 } });
  const F1 = '10000000-0000-4000-8000-000000000001', F2 = '10000000-0000-4000-8000-000000000002';
  await asUser(db, A, async d => {
    await call(d, [folder(F1, 'one')]);
    // a failure halfway rolls back everything in the same call
    assert.match(await fails(call(d, [folder(F2, 'two'), { table: 'folders', op: 'insert', row: { ...folder(F2, 'dup').row } }])), /duplicate|unique/);
    assert.equal((await one(d, 'select count(*)::int n from folders')).n, 1);
    // a stale write is a conflict, and nothing else in the call is kept
    await call(d, [{ table: 'folders', op: 'update', row: { id: F1, revision: 1, name: 'renamed' } }]);
    const stale = await fails(call(d, [folder(F2, 'two'), { table: 'folders', op: 'update', row: { id: F1, revision: 1, name: 'again' } }]));
    assert.match(stale, /conflict/);
    assert.deepEqual(await all(d, 'select name, revision from folders'), [{ name: 'renamed', revision: 2 }]);
    // only the app's tables and real columns are accepted
    assert.match(await fails(call(d, [{ table: 'user_ai_settings', op: 'insert', row: {} }])), /unknown table/);
    assert.match(await fails(call(d, [{ table: 'folders; drop table folders', op: 'insert', row: {} }])), /unknown table/);
    assert.match(await fails(call(d, [{ table: 'folders', op: 'update', row: { id: F1, revision: 2, 'name; drop table folders': 'x' } }])), /bad columns/);
    assert.match(await fails(call(d, [{ table: 'folders', op: 'truncate', row: {} }])), /unknown operation/);
    // it cannot be used to reach someone else's rows or write as them
    assert.match(await fails(call(d, [{ ...folder('10000000-0000-4000-8000-000000000009', 'sneaky'), row: { ...folder('x', 'sneaky').row, id: '10000000-0000-4000-8000-000000000009', owner_id: B } }])), /row-level security/);
    await call(d, [{ table: 'folders', op: 'delete', row: { id: F1 } }]);
    assert.equal((await one(d, 'select count(*)::int n from folders')).n, 0);
  });
  assert.match(await fails(db.query('select exe_apply_writes($1::jsonb)', ['[]']).then(() => asUser(db, A, d => d.query(`select exe_apply_writes('{"a":1}'::jsonb)`)))), /must be a list/);
  await db.exec('set role anon');
  assert.match(await fails(db.query(`select exe_apply_writes('[]'::jsonb)`)), /permission denied/);
  await db.exec('reset role');
});

test('exe_apply_writes_once: a retried key never applies twice, and a failed attempt can be retried', async () => {
  const db = await freshDb();
  const once = (d, key, writes) => d.query('select exe_apply_writes_once($1, $2::jsonb) as applied', [key, JSON.stringify(writes)]);
  const folder = (id, name) => ({ table: 'folders', op: 'insert', row: { id, owner_id: A, name, description: '', icon: 'folder', position: 0, created_at: '2027-01-01T00:00:00Z', updated_at: '2027-01-01T00:00:00Z', revision: 1 } });
  const F1 = '30000000-0000-4000-8000-000000000001', F2 = '30000000-0000-4000-8000-000000000002', KEY = 'aaaaaaaa-0000-4000-8000-000000000001';
  await asUser(db, A, async d => {
    assert.equal((await once(d, KEY, [folder(F1, 'one')])).rows[0].applied, true);
    assert.equal((await once(d, KEY, [folder(F1, 'one')])).rows[0].applied, false);                  // the retry is a no-op
    assert.equal((await one(d, 'select count(*)::int n from folders')).n, 1);
    assert.match(await fails(once(d, KEY, [folder(F2, 'different')])), /reused with different writes/);
    // a failing attempt does not consume its key, so it can be retried once fixed
    const K2 = 'aaaaaaaa-0000-4000-8000-000000000002';
    assert.match(await fails(once(d, K2, [folder(F2, ''), ])), /check|violates/);
    assert.equal((await one(d, 'select count(*)::int n from idempotency_keys')).n, 1);
    assert.equal((await once(d, K2, [folder(F2, 'two')])).rows[0].applied, true);
  });
  await asUser(db, B, async d => { const f = folder('30000000-0000-4000-8000-000000000009', 'b'); f.row.owner_id = B; assert.equal((await once(d, KEY, [f])).rows[0].applied, true); });   // keys are per user
});
