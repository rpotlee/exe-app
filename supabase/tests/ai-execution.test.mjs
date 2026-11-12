import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshDb, asUser, fails, one, A, B } from './harness.mjs';

const L1='10000000-0000-4000-8000-000000000011', L2='10000000-0000-4000-8000-000000000012';

test('AI budgets cover owners and the system, and usage records actual tokens and cost', async () => {
  const db=await freshDb();
  await db.exec('set role service_role');
  await db.query('update ai_limits set owner_tokens_per_day=1000,system_tokens_per_day=1500,system_tokens_per_minute=30000');
  await db.query("insert into ai_model_rates(provider,model,input_micro_usd_per_million,output_micro_usd_per_million) values ('openai','unknown',1000000,2000000)");
  const gate=async (owner,lease,n)=>(await one(db,'select exe_ai_acquire($1,$2,$3) gate',[owner,lease,n])).gate;
  assert.equal((await gate(A,L1,800)).granted,true);
  assert.equal(await one(db,'select exe_ai_release($1,$2,800,700,0,null,60,\'ok\',125) released',[A,L1]).then(r=>r.released),true);
  assert.equal((await gate(A,L2,400)).code,'DAILY_BUDGET');
  assert.equal((await gate(B,L2,800)).granted,true);
  assert.equal((await gate(B,L1,100)).code,'DAILY_BUDGET');
  await db.query('update ai_limits set owner_tokens_per_day=5000,system_tokens_per_day=10000,owner_micro_usd_per_day=1500,background_enabled=true');
  assert.equal((await gate(A,L2,100)).code,'DAILY_BUDGET','cost budget still applies after increasing token budget');
  await db.query('update ai_limits set owner_micro_usd_per_day=1000000');
  assert.equal((await one(db,"select exe_ai_acquire($1,$2,100,'background') gate",[A,L2])).gate.code,'INTERACTIVE_PRIORITY');
  const usage=await one(db,'select used_tokens,status,latency_ms,estimated_micro_usd from ai_usage where owner_id=$1',[A]);
  assert.deepEqual([usage.used_tokens,usage.status,usage.latency_ms,Number(usage.estimated_micro_usd)],[700,'ok',125,1400]);
  await db.exec('reset role');
  assert.equal((await asUser(db,A,d=>one(d,'select count(*)::int n from ai_usage'))).n,1);
  assert.equal((await asUser(db,B,d=>one(d,'select count(*)::int n from ai_usage'))).n,0);
  assert.match(await fails(asUser(db,A,d=>d.query('update ai_limits set background_enabled=true'))),/permission denied/);
});

test('durable jobs deduplicate, fence leases, back off, and keep intelligence owner-only', async () => {
  const db=await freshDb();
  const cap='20000000-0000-4000-8000-000000000001';
  await db.exec('set role service_role');
  const job=await one(db,"insert into ai_jobs(owner_id,kind,dedupe_key,capture_ids) values ($1,'organization','same',$2) returning id",[A,[cap]]);
  assert.match(await fails(db.query("insert into ai_jobs(owner_id,kind,dedupe_key,capture_ids) values ($1,'organization','same',$2)",[A,[cap]])),/unique|duplicate/);
  const claim=async (lease)=>(await one(db,'select exe_ai_claim_job($1,$2,$3) result',[A,job.id,lease])).result;
  assert.equal((await claim(L1)).claimed,true);
  assert.equal((await claim(L2)).reason,'running');
  assert.equal((await one(db,'select exe_ai_finish_job($1,$2,$3,true) ok',[A,job.id,L2])).ok,false);
  assert.equal((await one(db,"select exe_ai_finish_job($1,$2,$3,false,'RATE_LIMIT') ok",[A,job.id,L1])).ok,true);
  assert.equal((await claim(L2)).reason,'backoff');
  await db.query("update ai_jobs set available_at=now()-interval '1 second' where id=$1",[job.id]);
  assert.equal((await claim(L2)).claimed,true);
  assert.equal((await one(db,'select exe_ai_finish_job($1,$2,$3,true) ok',[A,job.id,L2])).ok,true);
  const row=await one(db,"insert into ai_intelligence(owner_id,job_id,dedupe_key,provider,model,source_revisions,result) values ($1,$2,'same','openai','unknown',$3,$4) returning id",[A,job.id,{[cap]:1},{items:[],priorities:[],groups:[{name:'Group',ids:[cap,'second'],why:'Related'}],dependencies:[]}]);
  assert.equal((await one(db,'select exe_ai_dismiss_group($1,$2,$3) ok',[B,row.id,'second,'+cap])).ok,false);
  assert.equal((await one(db,'select exe_ai_dismiss_group($1,$2,$3) ok',[A,row.id,'second,'+cap])).ok,true);
  await db.exec('reset role');
  assert.equal((await asUser(db,A,d=>one(d,'select count(*)::int n from ai_intelligence'))).n,1);
  assert.equal((await asUser(db,B,d=>one(d,'select count(*)::int n from ai_intelligence'))).n,0);
  assert.match(await fails(asUser(db,A,d=>d.query('select * from ai_jobs'))),/permission denied/);
  assert.match(await fails(asUser(db,A,d=>d.query("update ai_intelligence set result='{}'"))),/permission denied/);
});

test('intelligence save is atomic with capture revisions and the active job lease', async () => {
  const db=await freshDb();
  const cap=await asUser(db,A,d=>one(d,"insert into captures(text) values ('Email the venue') returning id,revision"));
  await db.exec('set role service_role');
  const job=await one(db,"insert into ai_jobs(owner_id,kind,dedupe_key,capture_ids) values ($1,'organization','first',$2) returning id",[A,[cap.id]]);
  assert.equal((await one(db,'select exe_ai_claim_job($1,$2,$3) result',[A,job.id,L1])).result.claimed,true);
  await db.exec('reset role');
  await asUser(db,A,d=>d.query("update captures set edited_text='Email the new venue' where id=$1",[cap.id]));
  await db.exec('set role service_role');
  const result={items:[],priorities:[],groups:[],dependencies:[]};
  const save=async (jid,lease,revisions)=>(await one(db,'select exe_ai_save_intelligence($1,$2,$3,$4,$5,$6,$7) saved',[A,jid,lease,'openai','test-model',revisions,result])).saved;
  assert.equal(await save(job.id,L1,{[cap.id]:cap.revision}),false,'changed capture cannot receive stale analysis');
  assert.equal((await one(db,'select count(*)::int n from ai_intelligence')).n,0);
  await one(db,"select exe_ai_finish_job($1,$2,$3,false,'AI_STALE')",[A,job.id,L1]);
  const fresh=await one(db,'select revision from captures where id=$1',[cap.id]);
  const next=await one(db,"insert into ai_jobs(owner_id,kind,dedupe_key,capture_ids) values ($1,'organization','second',$2) returning id",[A,[cap.id]]);
  assert.equal((await one(db,'select exe_ai_claim_job($1,$2,$3) result',[A,next.id,L2])).result.claimed,true);
  assert.equal(await save(next.id,L1,{[cap.id]:fresh.revision}),false,'old lease cannot save');
  assert.equal(await save(next.id,L2,{[cap.id]:fresh.revision}),true);
  assert.equal(await save(next.id,L2,{[cap.id]:fresh.revision}),false,'completed job cannot apply twice');
  assert.equal((await one(db,'select count(*)::int n from ai_intelligence')).n,1);
  assert.equal((await one(db,"select count(*)::int n from audit_events where action='ai-analysis'")).n,1);
  await db.exec('reset role');
});

test('only a user-configured model can be routed through the shared admission gate', async () => {
  const db=await freshDb();
  await db.exec('set role service_role');
  await db.query("insert into user_ai_settings(owner_id,provider,model,analysis_model,key_ciphertext,key_last4) values ($1,'openai','main-model','analysis-model',decode('aa','hex'),'last')",[A]);
  const gate=await one(db,"select exe_ai_acquire($1,$2,100,'interactive','analysis-model') result",[A,L1]);
  assert.equal(gate.result.granted,true);
  assert.equal((await one(db,'select lease_model from ai_admission where owner_id=$1',[A])).lease_model,'analysis-model');
  assert.match(await fails(db.query("select exe_ai_acquire($1,$2,100,'interactive','unapproved-model')",[A,L2])),/not configured/);
  await db.exec('reset role');
  assert.equal((await asUser(db,A,d=>one(d,'select analysis_model from user_ai_settings'))).analysis_model,'analysis-model');
  assert.match(await fails(asUser(db,A,d=>d.query("update user_ai_settings set analysis_model='wrong'"))),/permission denied/);
});

test('global and provider request rates apply across multiple owners', async () => {
  const db=await freshDb();await db.exec('set role service_role');
  await db.query('update ai_limits set system_requests_per_minute=1,owner_min_spacing_seconds=0');
  const acquire=async(owner,lease)=>(await one(db,'select exe_ai_acquire($1,$2,100) gate',[owner,lease])).gate;
  assert.equal((await acquire(A,L1)).granted,true);
  await one(db,'select exe_ai_release($1,$2,100,90)',[A,L1]);
  assert.equal((await acquire(B,L2)).granted,false);
  await db.query('update ai_limits set system_requests_per_minute=100');
  await db.query("update ai_provider_limits set requests_per_minute=1 where provider='openai'");
  assert.equal((await acquire(B,L2)).granted,false,'provider-wide request limit still applies');
  await db.exec('reset role');
});

test('saved analysis indexes one owner-readable group and dependency graph without granting mutation', async () => {
  const db=await freshDb();
  await db.exec('set role service_role');
  const first='20000000-0000-4000-8000-000000000021', second='20000000-0000-4000-8000-000000000022';
  const row=await one(db,"insert into ai_intelligence(owner_id,dedupe_key,provider,model,source_revisions,result) values ($1,'graph','openai','test',$2,$3) returning id",[A,{[first]:1,[second]:1},{items:[],priorities:[],groups:[{name:'Travel',ids:[first,second],why:'Same trip'}],dependencies:[{before:first,after:second,why:'Book first'}]}]);
  assert.deepEqual((await one(db,'select name,capture_ids from ai_group_proposals where intelligence_id=$1',[row.id])).capture_ids,[first,second]);
  assert.equal((await one(db,'select before_capture_id from ai_dependency_proposals where intelligence_id=$1',[row.id])).before_capture_id,first);
  await db.exec('reset role');
  assert.equal((await asUser(db,A,d=>one(d,'select count(*)::int n from ai_group_proposals'))).n,1);
  assert.equal((await asUser(db,B,d=>one(d,'select count(*)::int n from ai_group_proposals'))).n,0);
  assert.equal((await asUser(db,B,d=>one(d,'select count(*)::int n from ai_dependency_proposals'))).n,0);
  assert.match(await fails(asUser(db,A,d=>d.query("update ai_group_proposals set name='Wrong'"))),/permission denied/);
  assert.match(await fails(asUser(db,A,d=>d.query("insert into ai_dependency_proposals(owner_id,intelligence_id,ordinal,before_capture_id,after_capture_id) values ($1,$2,2,$3,$4)",[A,row.id,first,second]))),/permission denied/);
});
